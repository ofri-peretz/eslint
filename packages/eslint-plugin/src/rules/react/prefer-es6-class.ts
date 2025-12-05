/**
 * ESLint Rule: prefer-es6-class
 * Prefer ES6 classes over createClass
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'preferEs6Class';

export const preferEs6Class = createRule<[], MessageIds>({
  name: 'prefer-es6-class',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prefer ES6 classes over createClass',
    },
    schema: [],
    messages: {
      preferEs6Class: formatLLMMessage({
        icon: MessageIcons.MIGRATION,
        issueName: 'Legacy createClass',
        description: 'React.createClass() is deprecated',
        severity: 'HIGH',
        fix: 'Convert to ES6 class component',
        documentationLink: 'https://react.dev/reference/react/createClass',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check for React.createClass()
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.object.type === 'Identifier' &&
          node.callee.object.name === 'React' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'createClass'
        ) {
          context.report({
            node: node.callee.property,
            messageId: 'preferEs6Class',
          });
        }

        // Check for createClass() (imported)
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'createClass'
        ) {
          context.report({
            node: node.callee,
            messageId: 'preferEs6Class',
          });
        }
      },
    };
  },
});
