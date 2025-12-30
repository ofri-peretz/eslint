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
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'workerInnerhtml' | 'sanitizeWorkerData';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

// Dangerous DOM properties and methods
const DANGEROUS_PROPERTIES = ['innerHTML', 'outerHTML'];
const DANGEROUS_METHODS = ['insertAdjacentHTML', 'write', 'writeln'];

export const noWorkerMessageInnerhtml = createRule<RuleOptions, MessageIds>({
  name: 'no-worker-message-innerhtml',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow using innerHTML with Web Worker message data',
    },
    hasSuggestions: true,
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
      sanitizeWorkerData: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Sanitize Worker Data',
        description: 'Use textContent or sanitize with DOMPurify',
        severity: 'LOW',
        fix: 'const sanitized = DOMPurify.sanitize(event.data);\nelement.innerHTML = sanitized;',
        documentationLink: 'https://github.com/cure53/DOMPurify',
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
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    // Track Worker message handlers
    let inWorkerHandler = false;
    let eventParamName: string | null = null;

    /**
     * Check if we're in a Worker onmessage assignment
     */
    function isWorkerOnmessageAssignment(
      node: TSESTree.AssignmentExpression,
    ): { isHandler: boolean; eventParam: string | null } {
      if (
        node.left.type === AST_NODE_TYPES.MemberExpression &&
        node.left.property.type === AST_NODE_TYPES.Identifier &&
        node.left.property.name === 'onmessage'
      ) {
        // Check if object looks like a worker
        const objName = node.left.object.type === AST_NODE_TYPES.Identifier
          ? node.left.object.name.toLowerCase()
          : '';
        if (
          objName.includes('worker') ||
          objName === 'w' ||
          objName === 'wk'
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
     * Check if we're in a Worker addEventListener('message')
     */
    function isWorkerAddEventListener(
      node: TSESTree.CallExpression,
    ): { isHandler: boolean; eventParam: string | null } {
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
          // Check if object looks like a worker
          const obj = node.callee.object;
          if (obj.type === AST_NODE_TYPES.Identifier) {
            const objName = obj.name.toLowerCase();
            if (
              objName.includes('worker') ||
              objName === 'w' ||
              objName === 'wk'
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
        // Check if entering Worker handler
        const { isHandler, eventParam } = isWorkerOnmessageAssignment(node);
        if (isHandler) {
          inWorkerHandler = true;
          eventParamName = eventParam;
        }

        // Check for innerHTML/outerHTML assignment within handler
        if (!inWorkerHandler || !eventParamName) return;

        if (
          node.left.type === AST_NODE_TYPES.MemberExpression &&
          node.left.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_PROPERTIES.includes(node.left.property.name)
        ) {
          if (referencesEventData(node.right, eventParamName)) {
            context.report({
              node,
              messageId: 'workerInnerhtml',
              data: { method: node.left.property.name },
              suggest: [{ messageId: 'sanitizeWorkerData', fix: () => null }],
            });
          }
        }
      },

      'AssignmentExpression:exit'(node: TSESTree.AssignmentExpression) {
        const { isHandler } = isWorkerOnmessageAssignment(node);
        if (isHandler) {
          inWorkerHandler = false;
          eventParamName = null;
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        // Check if entering addEventListener handler
        const { isHandler, eventParam } = isWorkerAddEventListener(node);
        if (isHandler) {
          inWorkerHandler = true;
          eventParamName = eventParam;
        }

        // Check for dangerous method calls within handler
        if (!inWorkerHandler || !eventParamName) return;

        if (
          node.callee.type === AST_NODE_TYPES.MemberExpression &&
          node.callee.property.type === AST_NODE_TYPES.Identifier &&
          DANGEROUS_METHODS.includes(node.callee.property.name)
        ) {
          for (const arg of node.arguments) {
            if (referencesEventData(arg, eventParamName)) {
              context.report({
                node,
                messageId: 'workerInnerhtml',
                data: { method: node.callee.property.name },
                suggest: [{ messageId: 'sanitizeWorkerData', fix: () => null }],
              });
              break;
            }
          }
        }
      },

      'CallExpression:exit'(node: TSESTree.CallExpression) {
        const { isHandler } = isWorkerAddEventListener(node);
        if (isHandler) {
          inWorkerHandler = false;
          eventParamName = null;
        }
      },
    };
  },
});
