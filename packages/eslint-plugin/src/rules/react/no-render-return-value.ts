/**
 * ESLint Rule: no-render-return-value
 * Prevent using render return value
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noRenderReturnValue';

export const noRenderReturnValue = createRule<[], MessageIds>({
  name: 'no-render-return-value',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent using render return value',
    },
    messages: {
      noRenderReturnValue: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Render Return Value Usage',
        description: 'Using return value of ReactDOM.render()',
        severity: 'HIGH',
        fix: 'ReactDOM.render() return value is deprecated, use refs instead',
        documentationLink: 'https://react.dev/reference/react-dom/render',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (
          node.init &&
          node.init.type === 'CallExpression' &&
          isReactDOMRenderCall(node.init)
        ) {
          context.report({
            node: node.id,
            messageId: 'noRenderReturnValue',
          });
        }
      },

      AssignmentExpression(node: TSESTree.AssignmentExpression) {
        if (
          node.right.type === 'CallExpression' &&
          isReactDOMRenderCall(node.right)
        ) {
          context.report({
            node: node.left,
            messageId: 'noRenderReturnValue',
          });
        }
      },
    };
  },
});

/**
 * Check if call expression is ReactDOM.render()
 */
function isReactDOMRenderCall(node: TSESTree.CallExpression): boolean {
  if (
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'MemberExpression' &&
    node.callee.object.object.type === 'Identifier' &&
    node.callee.object.object.name === 'ReactDOM' &&
    node.callee.object.property.type === 'Identifier' &&
    node.callee.object.property.name === 'render' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'render'
  ) {
    return false; // This would be ReactDOM.render.render which is invalid
  }

  return (
    node.callee.type === 'MemberExpression' &&
    node.callee.object.type === 'Identifier' &&
    node.callee.object.name === 'ReactDOM' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'render'
  );
}
