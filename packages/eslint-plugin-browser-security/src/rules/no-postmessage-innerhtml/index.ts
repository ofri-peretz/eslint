/**
 * ESLint Rule: no-postmessage-innerhtml
 * Detects unsafe innerHTML usage in postMessage handlers
 * CWE-79: Improper Neutralization of Input During Web Page Generation
 *
 * @see https://cwe.mitre.org/data/definitions/79.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns
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

// Dangerous DOM properties
const DANGEROUS_PROPERTIES = ['innerHTML', 'outerHTML'];
const DANGEROUS_METHODS = ['insertAdjacentHTML', 'write', 'writeln'];

export const noPostmessageInnerhtml = createRule<RuleOptions, MessageIds>({
  name: 'no-postmessage-innerhtml',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow using innerHTML or similar methods with postMessage data',
    },
    hasSuggestions: true,
    messages: {
      unsafeInnerhtml: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'XSS via postMessage',
        cwe: 'CWE-79',
        owasp: 'A03:2021',
        cvss: 8.8,
        description:
          'Using {{method}} with postMessage data allows XSS attacks. Any window can send malicious HTML that will be executed.',
        severity: 'HIGH',
        fix: 'Use textContent for plain text, or sanitize with DOMPurify before using innerHTML.',
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns',
      }),
      useTextContent: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Use Safe DOM Methods',
        description: 'Use textContent or sanitize input with DOMPurify',
        severity: 'LOW',
        fix: 'element.textContent = event.data; // For plain text\nelement.innerHTML = DOMPurify.sanitize(event.data); // For HTML',
        documentationLink:
          'https://github.com/cure53/DOMPurify',
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

    // Track message event handlers
    let inMessageHandler = false;
    let eventParamName: string | null = null;

    /**
     * Check if we're entering a message event handler
     */
    function checkMessageHandler(
      node: TSESTree.CallExpression,
    ): { isMessageHandler: boolean; eventParam: string | null } {
      if (
        node.callee.type === AST_NODE_TYPES.MemberExpression &&
        node.callee.property.type === AST_NODE_TYPES.Identifier &&
        node.callee.property.name === 'addEventListener' &&
        node.arguments.length >= 2
      ) {
        const eventTypeArg = node.arguments[0];
        if (
          eventTypeArg.type === AST_NODE_TYPES.Literal &&
          eventTypeArg.value === 'message'
        ) {
          const callback = node.arguments[1];
          if (
            callback.type === AST_NODE_TYPES.ArrowFunctionExpression ||
            callback.type === AST_NODE_TYPES.FunctionExpression
          ) {
            const firstParam = callback.params[0];
            if (firstParam && firstParam.type === AST_NODE_TYPES.Identifier) {
              return { isMessageHandler: true, eventParam: firstParam.name };
            }
          }
        }
      }
      return { isMessageHandler: false, eventParam: null };
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

    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check if entering message handler
        const { isMessageHandler, eventParam } = checkMessageHandler(node);
        if (isMessageHandler) {
          inMessageHandler = true;
          eventParamName = eventParam;
        }

        // Check for dangerous methods: insertAdjacentHTML, document.write
        if (!inMessageHandler || !eventParamName) return;

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_METHODS.includes(node.callee.property.name)
        ) {
          // Check if any argument references event.data
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
        const { isMessageHandler } = checkMessageHandler(node);
        if (isMessageHandler) {
          inMessageHandler = false;
          eventParamName = null;
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (!inMessageHandler || !eventParamName) return;

        // Check for innerHTML/outerHTML assignment
        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_PROPERTIES.includes(node.left.property.name)
        ) {
          // Check if right side references event.data
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
    };
  },
});
