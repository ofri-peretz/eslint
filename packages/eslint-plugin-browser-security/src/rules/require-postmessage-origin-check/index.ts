/**
 * ESLint Rule: require-postmessage-origin-check
 * Detects postMessage listeners without origin validation
 * CWE-346: Origin Validation Error
 *
 * @see https://cwe.mitre.org/data/definitions/346.html
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  createRule,
} from '@interlace/eslint-devkit';

type MessageIds = 'missingOriginCheck' | 'addOriginCheck';

export interface Options {
  /** Allow in test files. Default: false */
  allowInTests?: boolean;

  /** Trusted origins that satisfy the check. Default: [] */
  trustedOrigins?: string[];
}

type RuleOptions = [Options?];

/**
 * Check if a function body contains origin validation
 */
function hasOriginCheck(
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
): boolean {
  const text = sourceCode.getText(node);

  // Common origin validation patterns
  const originPatterns = [
    /event\.origin\s*[!=]==?\s*/,
    /e\.origin\s*[!=]==?\s*/,
    /\.origin\s*[!=]==?\s*/,
    /origin\s*[!=]==?\s*/,
    /checkOrigin/i,
    /validateOrigin/i,
    /isAllowedOrigin/i,
    /trustedOrigins/i,
    /allowedOrigins/i,
  ];

  return originPatterns.some((pattern) => pattern.test(text));
}

export const requirePostmessageOriginCheck = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'require-postmessage-origin-check',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require origin validation in postMessage event listeners',
    },
    hasSuggestions: true,
    messages: {
      missingOriginCheck: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Missing postMessage Origin Validation',
        cwe: 'CWE-346',
        description:
          'postMessage listener lacks origin check. Malicious sites can send messages that will be processed.',
        severity: 'HIGH',
        fix: "Add origin validation: if (event.origin !== 'https://trusted-domain.com') return;",
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#security_concerns',
      }),
      addOriginCheck: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Add Origin Check',
        description: 'Validate event.origin before processing message',
        severity: 'LOW',
        fix: "if (event.origin !== 'https://expected-origin.com') return;",
        documentationLink:
          'https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: {
            type: 'boolean',
            default: false,
          },
          trustedOrigins: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      allowInTests: false,
      trustedOrigins: [],
    },
  ],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = false } = options as Options;

    const filename = context.filename;
    const isTestFile =
      allowInTests && /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (isTestFile) {
      return {};
    }

    const sourceCode = context.sourceCode;

    return {
      CallExpression(node: TSESTree.CallExpression) {
        const callee = node.callee;

        // Check for addEventListener('message', handler) or window.addEventListener('message', handler)
        let isMessageListener = false;

        // window.addEventListener('message', ...) or this.addEventListener('message', ...)
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'addEventListener'
        ) {
          const eventArg = node.arguments[0];
          if (
            eventArg &&
            eventArg.type === 'Literal' &&
            eventArg.value === 'message'
          ) {
            isMessageListener = true;
          }
        }

        // Direct addEventListener('message', ...) - global scope
        if (
          callee.type === 'Identifier' &&
          callee.name === 'addEventListener'
        ) {
          const eventArg = node.arguments[0];
          if (
            eventArg &&
            eventArg.type === 'Literal' &&
            eventArg.value === 'message'
          ) {
            isMessageListener = true;
          }
        }

        if (!isMessageListener) {
          return;
        }

        // Get the handler function
        const handlerArg = node.arguments[1];
        if (!handlerArg) {
          return;
        }

        // Check if handler has origin validation
        if (
          handlerArg.type === 'FunctionExpression' ||
          handlerArg.type === 'ArrowFunctionExpression'
        ) {
          if (!hasOriginCheck(handlerArg, sourceCode)) {
            context.report({
              node: handlerArg,
              messageId: 'missingOriginCheck',
              suggest: [
                {
                  messageId: 'addOriginCheck',
                  fix: () => null,
                },
              ],
            });
          }
        }

        // Handler is a reference (variable) - can't analyze
        if (handlerArg.type === 'Identifier') {
          // Could add more sophisticated analysis here
          // For now, we skip variable references as they may be validated elsewhere
        }
      },
    };
  },
});
