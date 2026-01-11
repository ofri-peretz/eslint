/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-websocket-eval
 * Detects dangerous eval() usage with WebSocket message data
 * CWE-95: Improper Neutralization of Directives in Dynamically Evaluated Code
 *
 * @see https://cwe.mitre.org/data/definitions/95.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'evalWithWsData' | 'parseDataSafely';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Dangerous eval-like functions
const EVAL_FUNCTIONS = ['eval', 'Function'];

export const noWebsocketEval = createRule<RuleOptions, MessageIds>({
  name: 'no-websocket-eval',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow using eval() or Function() with WebSocket message data',
    },
    hasSuggestions: true,
    messages: {
      evalWithWsData: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Remote Code Execution via WebSocket',
        cwe: 'CWE-95',
        owasp: 'A03:2021',
        cvss: 9.8,
        description:
          'Using {{method}} with WebSocket data enables remote code execution. A compromised server or MITM attacker can execute arbitrary JavaScript.',
        severity: 'CRITICAL',
        fix: 'Parse WebSocket data as JSON and validate the structure instead of executing it.',
        documentationLink:
          'https://cwe.mitre.org/data/definitions/95.html',
      }),
      parseDataSafely: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Parse Data Safely',
        description: 'Use JSON.parse() and validate the data structure',
        severity: 'LOW',
        fix: 'const data = JSON.parse(event.data); if (data.action === "update") { handleUpdate(data); }',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse',
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

    // Track WebSocket handlers
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
        /* c8 ignore next - Recursive call for nested event.data.property */
        return referencesEventData(node.object, eventName);
      }
      /* c8 ignore next 3 - Direct event identifier reference edge case */
      if (node.type === AST_NODE_TYPES.Identifier && node.name === eventName) {
        return true;
      }
      return false;
    }

    /**
     * Check if this is an eval-like call
     */
    function isEvalCall(node: TSESTree.CallExpression): string | null {
      // eval(...)
      if (
        node.callee.type === AST_NODE_TYPES.Identifier &&
        EVAL_FUNCTIONS.includes(node.callee.name)
      ) {
        return node.callee.name;
      }
      /* c8 ignore start - Duplicate Function check for call expression pattern */
      if (
        node.type === AST_NODE_TYPES.CallExpression &&
        node.callee.type === AST_NODE_TYPES.Identifier &&
        node.callee.name === 'Function'
      ) {
        return 'Function';
      }
      /* c8 ignore stop */
      return null;
    }

    return {
      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        const { isHandler, eventParam } = isWsOnmessageAssignment(node);
        if (isHandler) {
          inWsHandler = true;
          eventParamName = eventParam;
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
        // Check if entering addEventListener handler
        const { isHandler, eventParam } = isWsAddEventListener(node);
        if (isHandler) {
          inWsHandler = true;
          eventParamName = eventParam;
        }

        // Check for eval-like calls within handler
        if (!inWsHandler || !eventParamName) return;

        const evalFn = isEvalCall(node);
        if (evalFn) {
          // Check if any argument references event.data
          for (const arg of node.arguments) {
            if (referencesEventData(arg, eventParamName)) {
              context.report({
                node,
                messageId: 'evalWithWsData',
                data: {
                  method: evalFn,
                },
                suggest: [
                  {
                    messageId: 'parseDataSafely',
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

      // Also check new Function() constructor
      NewExpression(node: TSESTree.NewExpression) {
        if (!inWsHandler || !eventParamName) return;

        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'Function'
        ) {
          for (const arg of node.arguments) {
            if (referencesEventData(arg, eventParamName)) {
              context.report({
                node,
                messageId: 'evalWithWsData',
                data: {
                  method: 'new Function',
                },
                suggest: [
                  {
                    messageId: 'parseDataSafely',
                    fix: () => null,
                  },
                ],
              });
              break;
            }
          }
        }
      },
    };
  },
});
