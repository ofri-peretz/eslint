/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-worker-message-innerhtml
 * Detects unsafe innerHTML usage with Web Worker message data
 * CWE-79: Improper Neutralization of Input During Web Page Generation
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Worker
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createPayloadResolver,
  createRule,
  formatLLMMessage,
  MessageIcons,
  isTestFilePath,
} from '@interlace/eslint-devkit';

type MessageIds = 'workerInnerhtml';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Dangerous DOM properties and methods
const DANGEROUS_PROPERTIES = new Set(['innerHTML', 'outerHTML']);
const DANGEROUS_METHODS = new Set(['insertAdjacentHTML', 'write', 'writeln']);

export const noWorkerMessageInnerhtml = createRule<RuleOptions, MessageIds>({
  name: 'no-worker-message-innerhtml',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-worker-message-innerhtml.md',
      description: 'Disallow using innerHTML with Web Worker message data',
      cwe: 'CWE-79',
      cvss: 7.5,
    },
    messages: {
      workerInnerhtml: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'XSS via Worker Message',
        cwe: 'CWE-79',
        owasp: 'A03:2021',
        cvss: 7.5,
        description:
          'Using {{method}} with Worker message data can enable XSS if the worker processes untrusted input.',
        severity: 'HIGH',
        fix: 'Sanitize worker data with DOMPurify before rendering, or use textContent.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/Worker/message_event',
      }),

    },
    schema: [
      {
        type: 'object',
        properties: { allowInTests: { type: 'boolean', default: true } },
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
    const isTestFile = isTestFilePath(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // Track Worker message handlers

    /**
     * Check if we're in a Worker onmessage assignment
     */
    function isWorkerOnmessageAssignment(node: TSESTree.AssignmentExpression): {
      isHandler: boolean;
      eventParam: string | null;
    } {
      if (
        node.left.type === AST_NODE_TYPES.MemberExpression &&
        node.left.property.type === AST_NODE_TYPES.Identifier &&
        node.left.property.name === 'onmessage'
      ) {
        // No receiver-NAME gate. `const button = new Worker('w.js')` is a
        // Worker whatever it is called; the name check made ownership depend
        // on spelling, and combined with no-innerhtml's skip that meant the
        // finding was reported by nobody. The resolver below identifies the
        // binding by construction.
        {
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
     * Check if we're in a Worker addEventListener('message')
     */
    function isWorkerAddEventListener(node: TSESTree.CallExpression): {
      isHandler: boolean;
      eventParam: string | null;
    } {
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        node.callee.property.name === 'addEventListener' &&
        node.arguments.length >= 2
      ) {
        // Check if it's a message event
        const eventType = node.arguments[0];
        if (
          eventType.type === AST_NODE_TYPES.Literal &&
          eventType.value === 'message'
        ) {
          // Identified by construction, not by spelling — see the note above.
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
    // to the worker source. Everything it cannot identify belongs to the
    // generic sink rule, so no value is ever reported by both.
    const payloadSource = createPayloadResolver(context.sourceCode);

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {

        // Check for innerHTML/outerHTML assignment within handler
        // The resolver is the sole sink condition. A mutable in-handler
        // flag was cleared by any NESTED handler's exit, so sinks after
        // one went unreported here while no-innerhtml skipped them as
        // ours — the finding belonged to nobody.

        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_PROPERTIES.has(node.left.property.name)
        ) {
          if (payloadSource(node.right) === 'worker') {
            context.report({
              node,
              messageId: 'workerInnerhtml',
              data: { method: node.left.property.name },
            });
          }
        }
      },

      'AssignmentExpression:exit'(node: TSESTree.AssignmentExpression) {
        const { isHandler } = isWorkerOnmessageAssignment(node);
        if (isHandler) {
        }
      },

      CallExpression(node: TSESTree.CallExpression) {

        // Check for dangerous method calls within handler
        // The resolver is the sole sink condition. A mutable in-handler
        // flag was cleared by any NESTED handler's exit, so sinks after
        // one went unreported here while no-innerhtml skipped them as
        // ours — the finding belonged to nobody.

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_METHODS.has(node.callee.property.name)
        ) {
          for (const arg of node.arguments) {
            if (payloadSource(arg) === 'worker') {
              context.report({
                node,
                messageId: 'workerInnerhtml',
                data: { method: node.callee.property.name },
              });
              break;
            }
          }
        }
      },

      'CallExpression:exit'(node: TSESTree.CallExpression) {
        const { isHandler } = isWorkerAddEventListener(node);
        if (isHandler) {
        }
      },
    };
  },
});
