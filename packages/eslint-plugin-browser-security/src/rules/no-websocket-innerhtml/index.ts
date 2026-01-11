/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-websocket-innerhtml
 * Detects unsafe innerHTML usage with WebSocket message data
 * CWE-79: Improper Neutralization of Input During Web Page Generation
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'unsafeInnerhtml' | 'useTextContent';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Dangerous DOM properties and methods
const DANGEROUS_PROPERTIES = ['innerHTML', 'outerHTML'];
const DANGEROUS_METHODS = ['insertAdjacentHTML', 'write', 'writeln'];

export const noWebsocketInnerhtml = createRule<RuleOptions, MessageIds>({
  name: 'no-websocket-innerhtml',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow using innerHTML or similar methods with WebSocket message data',
    },
    hasSuggestions: true,
    messages: {
      unsafeInnerhtml: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'XSS via WebSocket',
        cwe: 'CWE-79',
        owasp: 'A03:2021',
        cvss: 8.1,
        description:
          'Using {{method}} with WebSocket data enables XSS attacks. Malicious server or MITM can send crafted HTML to execute scripts.',
        severity: 'HIGH',
        fix: 'Use textContent for plain text, or sanitize with DOMPurify before using innerHTML.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket',
      }),
      useTextContent: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Safe DOM Methods',
        description: 'Use textContent or sanitize input with DOMPurify',
        severity: 'LOW',
        fix: 'element.textContent = event.data; // For plain text\nelement.innerHTML = DOMPurify.sanitize(event.data); // For HTML',
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

    // Track WebSocket onmessage handlers
    let inWsHandler = false;
    let eventParamName: string | null = null;

    /**
     * Check if we're in a WebSocket onmessage assignment
     */
    function isWsOnmessageAssignment(
      node: TSESTree.AssignmentExpression,
    ): { isHandler: boolean; eventParam: string | null } {
      if (
        node.left.type === AST_NODE_TYPES.MemberExpression &&
        node.left.property.type === AST_NODE_TYPES.Identifier &&
        node.left.property.name === 'onmessage'
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
      return { isHandler: false, eventParam: null };
    }

    /**
     * Check if we're in a WebSocket addEventListener('message')
     */
    function isWsAddEventListener(
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
          eventType.value === 'message'
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
     * Check if expression references event.data
     */
    function referencesEventData(
      node: TSESTree.Node,
      eventName: string,
    ): boolean {
      if (node.type === AST_NODE_TYPES.MemberExpression) {
        if (
          node.object.type === AST_NODE_TYPES.Identifier &&
          node.object.name === eventName &&
          node.property.type === AST_NODE_TYPES.Identifier &&
          node.property.name === 'data'
        ) {
          return true;
        }
        return referencesEventData(node.object, eventName);
      }
      return false;
    }

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        // Check if this is ws.onmessage = handler
        const { isHandler, eventParam } = isWsOnmessageAssignment(node);
        if (isHandler) {
          inWsHandler = true;
          eventParamName = eventParam;
        }

        // Check for innerHTML/outerHTML assignment within handler
        if (!inWsHandler || !eventParamName) return;

        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_PROPERTIES.includes(node.left.property.name)
        ) {
          if (referencesEventData(node.right, eventParamName)) {
            context.report({
              node,
              messageId: 'unsafeInnerhtml',
              data: {
                method: node.left.property.name,
              },
              suggest: [
                {
                  messageId: 'useTextContent',
                  fix: () => null,
                },
              ],
            });
          }
        }
      },

      'AssignmentExpression:exit'(node: TSESTree.AssignmentExpression) {
        const { isHandler } = isWsOnmessageAssignment(node);
        if (isHandler) {
          inWsHandler = false;
          eventParamName = null;
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Check if this is ws.addEventListener('message', handler)
        const { isHandler, eventParam } = isWsAddEventListener(node);
        if (isHandler) {
          inWsHandler = true;
          eventParamName = eventParam;
        }

        // Check for dangerous method calls within handler
        if (!inWsHandler || !eventParamName) return;

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_METHODS.includes(node.callee.property.name)
        ) {
          for (const arg of node.arguments) {
            if (referencesEventData(arg, eventParamName)) {
              context.report({
                node,
                messageId: 'unsafeInnerhtml',
                data: {
                  method: node.callee.property.name,
                },
                suggest: [
                  {
                    messageId: 'useTextContent',
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
        const { isHandler } = isWsAddEventListener(node);
        if (isHandler) {
          inWsHandler = false;
          eventParamName = null;
        }
      },
    };
  },
});
