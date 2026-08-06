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
  createPayloadResolver,
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
const DANGEROUS_PROPERTIES = new Set(['innerHTML', 'outerHTML']);
const DANGEROUS_METHODS = new Set(['insertAdjacentHTML', 'write', 'writeln']);

/**
 * Does this expression read a FileReader's *result*?
 *
 * `e.target.result` / `e.result` — the file content. `e.target.foo` is some
 * other property of the reader and is not what this rule is about. Shape-based
 * so it needs no handler-parameter name: the resolver already established that
 * the value belongs to a FileReader handler; this says WHICH part.
 */
function readsFileReaderResult(node: TSESTree.Node): boolean {
  // Anywhere in the chain, not just the tail: `e.target.result.data` reads a
  // property OF the file content and is still the file content.
  let current: TSESTree.Node = node;
  while (current.type === AST_NODE_TYPES.MemberExpression) {
    if (
      current.property.type === AST_NODE_TYPES.Identifier &&
      current.property.name === 'result'
    ) {
      return true;
    }
    current = current.object;
  }
  return false;
}

export const noFilereaderInnerhtml = createRule<RuleOptions, MessageIds>({
  name: 'no-filereader-innerhtml',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-filereader-innerhtml.md',
      description:
        'Disallow using innerHTML or similar methods with FileReader data',
      cwe: 'CWE-79',
      cvss: 8.1,
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
    const filename = context.filename;
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // Track FileReader onload handlers

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
        // No receiver-NAME heuristic here. It used to require the name to
        // contain 'reader'/'fr'/'r', which is narrower than the resolver that
        // now decides ownership: `const f = new FileReader()` failed the name
        // check while the resolver still attributed the payload to filereader,
        // so no-innerhtml skipped it and THIS rule never fired — the finding
        // vanished. The gate below (payloadSource === 'filereader') resolves
        // the binding by construction, which is the correct question.
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
      return { isHandler: false, eventParam: null };
    }

    /**
     * Check if we're in a FileReader addEventListener('load')
     */
    function isFileReaderAddEventListener(node: TSESTree.CallExpression): {
      isHandler: boolean;
      eventParam: string | null;
    } {
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

    // Ownership gate: this rule reports only what the resolver attributes
    // to the filereader source. Everything it cannot identify belongs to the
    // generic sink rule, so no value is ever reported by both.
    const payloadSource = createPayloadResolver(context.sourceCode.ast);

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // No `inFileReaderHandler` gate. A nested handler overwrote the single
        // mutable `eventParamName`, and its exit cleared the OUTER handler's
        // state — so sinks after a nested handler went unreported. The resolver
        // already scopes per handler and picks the innermost, so it is the only
        // condition needed.

        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_PROPERTIES.has(node.left.property.name)
        ) {
          if (
            payloadSource(node.right) === 'filereader' &&
            readsFileReaderResult(node.right)
          ) {
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

      'AssignmentExpression:exit'(node: TSESTree.AssignmentExpression) {
        const { isHandler } = isFileReaderOnloadAssignment(node);
        if (isHandler) {
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Check if entering addEventListener handler

        // Same here — the resolver is the sink condition, not the mutable flag.

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_METHODS.has(node.callee.property.name)
        ) {
          for (const arg of node.arguments) {
            if (
              payloadSource(arg) === 'filereader' &&
              readsFileReaderResult(arg)
            ) {
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

      'CallExpression:exit'(node: TSESTree.CallExpression) {
        const { isHandler } = isFileReaderAddEventListener(node);
        if (isHandler) {
        }
      },
    };
  },
});
