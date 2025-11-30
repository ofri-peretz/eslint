/**
 * ESLint Rule: no-instanceof-array
 * Prefer Array.isArray() over instanceof Array
 */
import type { TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noInstanceofArray';

export interface Options {
  /** Allow instanceof Array in specific contexts */
  allow?: string[];
}

type RuleOptions = [Options?];

export const noInstanceofArray = createRule<RuleOptions, MessageIds>({
  name: 'no-instanceof-array',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer Array.isArray() over instanceof Array for better cross-realm compatibility',
    },
    hasSuggestions: false,
    messages: {
      noInstanceofArray: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Instanceof Array Check',
        description: 'instanceof Array fails across realms - use Array.isArray() instead',
        severity: 'MEDIUM',
        fix: 'Replace "value instanceof Array" with "Array.isArray(value)" for cross-realm compatibility',
        documentationLink: 'https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-instanceof-array.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
            default: [],
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allow: [] }],

  create(context) {
    const [options] = context.options;
    const { allow = [] } = options || {};

    const allowedContexts = new Set(allow);

    function isInstanceofArray(node: TSESTree.BinaryExpression): boolean {
      return (
        node.operator === 'instanceof' &&
        node.right.type === 'Identifier' &&
        node.right.name === 'Array'
      );
    }

    function isInAllowedContext(): boolean {
      // Check if we're in an allowed context
      // This is a simple implementation - could be extended for more complex cases
      for (const allowedContext of allowedContexts) {
        // For now, just check if the context string appears anywhere in the source
        const sourceText = context.sourceCode.getText();
        if (sourceText.includes(allowedContext)) {
          return true;
        }
      }
      return false;
    }

    return {
      BinaryExpression(node) {
        if (isInstanceofArray(node) && !isInAllowedContext()) {
          context.report({
            node,
            messageId: 'noInstanceofArray',
          });
        }
      },
    };
  },
});
