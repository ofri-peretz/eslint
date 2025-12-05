/**
 * ESLint Rule: no-is-mounted
 * Prevent isMounted anti-pattern
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noIsMounted';

type RuleOptions = [];
export const noIsMounted = createRule<RuleOptions, MessageIds>({
  name: 'no-is-mounted',
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent isMounted anti-pattern',
    },
    schema: [],
    messages: {
      noIsMounted: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'isMounted Usage',
        description: 'isMounted anti-pattern detected',
        severity: 'HIGH',
        fix: 'Use proper lifecycle management or cancellation tokens',
        documentationLink: 'https://react.dev/blog/2015/12/16/ismounted-antipattern.html',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      // Check for isMounted property access (covers both property access and method calls)
      MemberExpression(node: TSESTree.MemberExpression) {
        if (
          node.property.type === 'Identifier' &&
          node.property.name === 'isMounted'
        ) {
          context.report({
            node: node.property,
            messageId: 'noIsMounted',
          });
        }
      },

      // Check for isMounted variable declarations
      'VariableDeclarator[id.name="isMounted"]'(node: TSESTree.VariableDeclarator) {
        context.report({
          node: node.id,
          messageId: 'noIsMounted',
        });
      },
    };
  },
});
