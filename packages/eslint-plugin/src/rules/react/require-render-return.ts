/**
 * ESLint Rule: require-render-return
 * Require render methods to return
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '../../utils/create-rule';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'requireRenderReturn';

export const requireRenderReturn = createRule<[], MessageIds>({
  name: 'require-render-return',
  meta: {
    type: 'problem',
    docs: {
      description: 'Require render methods to return',
    },
    messages: {
      requireRenderReturn: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Missing Render Return',
        description: 'Render method must return a value',
        severity: 'CRITICAL',
        fix: 'Add return statement or return JSX/null',
        documentationLink: 'https://react.dev/reference/react/Component#render',
      }),
    },
  },
  defaultOptions: [],
  create(context) {
    return {
      MethodDefinition(node: TSESTree.MethodDefinition) {
        if (
          node.key.type === 'Identifier' &&
          node.key.name === 'render' &&
          node.value.type === 'FunctionExpression'
        ) {
          const body = node.value.body;

          // Check if render method has a return statement
          if (!hasReturnStatement(body)) {
            context.report({
              node: node.key,
              messageId: 'requireRenderReturn',
            });
          }
        }
      },
    };

    function hasReturnStatement(node: TSESTree.BlockStatement): boolean {
      for (const statement of node.body) {
        if (statement.type === 'ReturnStatement') {
          return true;
        }

        // Check nested blocks (if statements, etc.)
        if (statement.type === 'IfStatement') {
          if (hasReturnStatement(statement.consequent) ||
              (statement.alternate && hasReturnStatement(statement.alternate))) {
            return true;
          }
        }

        if (statement.type === 'SwitchStatement') {
          for (const switchCase of statement.cases) {
            for (const caseStatement of switchCase.consequent) {
              if (caseStatement.type === 'ReturnStatement') {
                return true;
              }
            }
          }
        }
      }

      return false;
    }
  },
});
