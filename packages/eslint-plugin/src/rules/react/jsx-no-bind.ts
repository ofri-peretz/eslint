/**
 * ESLint Rule: jsx-no-bind
 * Prevent .bind() in JSX (performance issue)
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'jsxNoBind';

export const jsxNoBind = createRule<[], MessageIds>({
  name: 'jsx-no-bind',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent .bind() in JSX',
    },
    schema: [],
    messages: {
      jsxNoBind: formatLLMMessage({
        icon: MessageIcons.PERFORMANCE,
        issueName: 'Bind in JSX',
        description: 'Using .bind() in JSX creates new function on every render',
        severity: 'HIGH',
        fix: 'Use arrow function or bind in constructor/class field',
        documentationLink: 'https://react.dev/learn/render-and-commit#should-you-add-eslint-rules',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.value && node.value.type === 'JSXExpressionContainer') {
          const expression = node.value.expression;

          // Skip empty expressions like {}
          if (expression.type === 'JSXEmptyExpression') {
            return;
          }

          // Check for .bind() calls
          if (isBindCall(expression)) {
            context.report({
              node: expression,
              messageId: 'jsxNoBind',
            });
          }
        }
      },
    };
  },
});

/**
 * Check if expression is a .bind() call
 */
function isBindCall(node: TSESTree.Expression): boolean {
  if (node.type === 'CallExpression') {
    if (
      node.callee.type === 'MemberExpression' &&
      node.callee.property.type === 'Identifier' &&
      node.callee.property.name === 'bind'
    ) {
      return true;
    }
  }

  return false;
}
