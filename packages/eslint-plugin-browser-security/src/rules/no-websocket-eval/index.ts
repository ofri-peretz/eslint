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
  createPayloadResolver,
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
const EVAL_FUNCTIONS = new Set(['eval', 'Function']);

export const noWebsocketEval = createRule<RuleOptions, MessageIds>({
  name: 'no-websocket-eval',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-browser-security/docs/rules/no-websocket-eval.md',
      description:
        'Disallow using eval() or Function() with WebSocket message data',
      cwe: 'CWE-95',
      cvss: 9.8,
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
        documentationLink: 'https://cwe.mitre.org/data/definitions/95.html',
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
    const filename = context.filename;
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    /**
     * Check if we're in a WebSocket addEventListener('message')
     */
    function isWsAddEventListener(node: TSESTree.CallExpression): {
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
     * Check if this is an eval-like call
     */
    function isEvalCall(node: TSESTree.CallExpression): string | null {
      // eval(...)
      if (
        node.callee.type === AST_NODE_TYPES.Identifier &&
        EVAL_FUNCTIONS.has(node.callee.name)
      ) {
        return node.callee.name;
      }
      // NOTE: no separate `Function` check is needed here — `Function` is a
      // member of EVAL_FUNCTIONS, so the branch above already handles it.
      return null;
    }

    // Ownership gate: this rule reports only what the resolver attributes
    // to the websocket source. Everything it cannot identify belongs to the
    // generic sink rule, so no value is ever reported by both.
    const payloadSource = createPayloadResolver(context.sourceCode);

    return {

      CallExpression(node: TSESTree.CallExpression) {

        // Check for eval-like calls within handler
        // The resolver is the sole sink condition. A mutable in-handler
        // flag was cleared by any NESTED handler's exit, so sinks after
        // one went unreported here while no-innerhtml skipped them as
        // ours — the finding belonged to nobody.

        const evalFn = isEvalCall(node);
        if (evalFn) {
          // Check if any argument references event.data
          for (const arg of node.arguments) {
            if (payloadSource(arg) === 'websocket') {
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
        }
      },

      // Also check new Function() constructor
      NewExpression(node: TSESTree.NewExpression) {
        // The resolver is the sole sink condition. A mutable in-handler
        // flag was cleared by any NESTED handler's exit, so sinks after
        // one went unreported here while no-innerhtml skipped them as
        // ours — the finding belonged to nobody.

        if (
          node.callee.type === AST_NODE_TYPES.Identifier &&
          node.callee.name === 'Function'
        ) {
          for (const arg of node.arguments) {
            if (payloadSource(arg) === 'websocket') {
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
