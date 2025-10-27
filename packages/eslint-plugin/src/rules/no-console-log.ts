/**
 * Example ESLint rule: no-console-log
 * This rule disallows the use of console.log in production code
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { createRule, isMemberExpression } from '../utils/create-rule';

type MessageIds = 'noConsoleLog';
type Options = [];

export const noConsoleLog = createRule<Options, MessageIds>({
  name: 'no-console-log',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow the use of console.log statements',
    },
    messages: {
      noConsoleLog:
        'Unexpected console.log statement. Use a proper logging library instead.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, Options>) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (isMemberExpression(node.callee, 'console', 'log')) {
          context.report({
            node,
            messageId: 'noConsoleLog',
          });
        }
      },
    };
  },
});

