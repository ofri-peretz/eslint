/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-filereader-innerhtml
 * Detects unsafe innerHTML usage with FileReader data
 * CWE-79: Improper Neutralization of Input During Web Page Generation
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileReader
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'unsafeInnerhtml' | 'sanitizeContent';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Dangerous DOM properties and methods
const DANGEROUS_PROPERTIES = ['innerHTML', 'outerHTML'];
const DANGEROUS_METHODS = ['insertAdjacentHTML', 'write', 'writeln'];

export const noFilereaderInnerhtml = createRule<RuleOptions, MessageIds>({
  name: 'no-filereader-innerhtml',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow using innerHTML or similar methods with FileReader data',
    },
    hasSuggestions: true,
    messages: {
      unsafeInnerhtml: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'XSS via File Upload',
        cwe: 'CWE-79',
        owasp: 'A03:2021',
        cvss: 8.1,
        description:
          'Using {{method}} with FileReader result enables XSS attacks. Malicious files can contain scripts that execute when rendered.',
        severity: 'HIGH',
        fix: 'Sanitize file content with DOMPurify before rendering, or use textContent for plain text.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/FileReader',
      }),
      sanitizeContent: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Sanitize File Content',
        description: 'Use textContent or sanitize with DOMPurify',
        severity: 'LOW',
        fix: 'const sanitized = DOMPurify.sanitize(e.target.result);\nelement.innerHTML = sanitized;',
        documentationLink: 'https://github.com/cure53/DOMPurify',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // Track FileReader onload handlers
    let inFileReaderHandler = false;
    let eventParamName: string | null = null;

    /**
     * Check if we're in a FileReader onload assignment
     */
    function isFileReaderOnloadAssignment(
      node: TSESTree.AssignmentExpression,
    ): { isHandler: boolean; eventParam: string | null } {
      if (
        node.left.type === AST_NODE_TYPES.MemberExpression &&
        node.left.property.type === AST_NODE_TYPES.Identifier &&
        (node.left.property.name === 'onload' ||
          node.left.property.name === 'onloadend')
      ) {
        // Check if object looks like a FileReader (reader, fileReader, fr, etc.)
        const objName = node.left.object.type === AST_NODE_TYPES.Identifier
          ? node.left.object.name.toLowerCase()
          : '';
        if (
          objName.includes('reader') ||
          objName.includes('fr') ||
          objName === 'r'
        ) {
          const handler = node.right;
          if (
            handler.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            handler.type === AST_NODE_TYPES.FunctionExpression
          ) {
            const firstParam = handler.params[0];
            if (firstParam && firstParam.type === AST_NODE_TYPES.Identifier) {
              return { isHandler: true, eventParam: firstParam.name };
            }
          }
        }
      }
      return { isHandler: false, eventParam: null };
    }

    /**
     * Check if we're in a FileReader addEventListener('load')
     */
    function isFileReaderAddEventListener(
      node: TSESTree.CallExpression,
    ): { isHandler: boolean; eventParam: string | null } {
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        node.callee.property.name === 'addEventListener' &&
        node.arguments.length >= 2
      ) {
        const eventType = node.arguments[0];
        if (
          eventType.type === AST_NODE_TYPES.Literal &&
          (eventType.value === 'load' || eventType.value === 'loadend')
        ) {
          const callback = node.arguments[1];
          if (
            callback.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            callback.type === AST_NODE_TYPES.FunctionExpression
          ) {
            const firstParam = callback.params[0];
            if (firstParam && firstParam.type === AST_NODE_TYPES.Identifier) {
              return { isHandler: true, eventParam: firstParam.name };
            }
          }
        }
      }
      return { isHandler: false, eventParam: null };
    }

    /**
     * Check if expression references e.target.result or event.target.result
     */
    function referencesFileReaderResult(
      node: TSESTree.Node,
      eventName: string,
    ): boolean {
      // Check for e.target.result pattern
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        if (
          node.property.type === AST_NODE_TYPES.Identifier &&
          node.property.name === 'result' &&
          node.object.type === AST_NODE_TYPES.MemberExpression &&
          node.object.property.type === AST_NODE_TYPES.Identifier &&
          node.object.property.name === 'target' &&
          node.object.object.type === AST_NODE_TYPES.Identifier &&
          node.object.object.name === eventName
        ) {
          return true;
        }
        // Check nested
        /* c8 ignore next - Recursive call for deeply nested expressions */
        return referencesFileReaderResult(node.object, eventName);
      }
      return false;
    }

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check if entering FileReader handler
        const { isHandler, eventParam } = isFileReaderOnloadAssignment(node);
        if (isHandler) {
          inFileReaderHandler = true;
          eventParamName = eventParam;
        }

        // Check for innerHTML/outerHTML assignment within handler
        if (!inFileReaderHandler || !eventParamName) return;

        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_PROPERTIES.includes(node.left.property.name)
        ) {
          if (referencesFileReaderResult(node.right, eventParamName)) {
            context.report({
              node,
              messageId: 'unsafeInnerhtml',
              data: {
                method: node.left.property.name,
              },
              suggest: [
                {
                  messageId: 'sanitizeContent',
                  fix: () => null,
                },
              ],
            });
          }
        }
      },

      /* c8 ignore start - Exit handler cleanup, not testable with RuleTester */
      'AssignmentExpression:exit'(node: TSESTree.AssignmentExpression) {
        const { isHandler } = isFileReaderOnloadAssignment(node);
        if (isHandler) {
          inFileReaderHandler = false;
          eventParamName = null;
        }
      },
      /* c8 ignore stop */

      CallExpression(node: TSESTree.CallExpression) {
        // Check if entering addEventListener handler
        const { isHandler, eventParam } = isFileReaderAddEventListener(node);
        if (isHandler) {
          inFileReaderHandler = true;
          eventParamName = eventParam;
        }

        // Check for dangerous method calls within handler
        if (!inFileReaderHandler || !eventParamName) return;

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_METHODS.includes(node.callee.property.name)
        ) {
          for (const arg of node.arguments) {
            if (referencesFileReaderResult(arg, eventParamName)) {
              context.report({
                node,
                messageId: 'unsafeInnerhtml',
                data: {
                  method: node.callee.property.name,
                },
                suggest: [
                  {
                    messageId: 'sanitizeContent',
                    fix: () => null,
                  },
                ],
              });
              break;
            }
          }
        }
      },

      /* c8 ignore start - Exit handler cleanup, not testable with RuleTester */
      'CallExpression:exit'(node: TSESTree.CallExpression) {
        const { isHandler } = isFileReaderAddEventListener(node);
        if (isHandler) {
          inFileReaderHandler = false;
          eventParamName = null;
        }
      },
      /* c8 ignore stop */
    };
  },
});
