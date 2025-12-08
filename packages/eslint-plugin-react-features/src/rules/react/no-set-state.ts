/**
 * ESLint Rule: no-set-state
 * Disallow usage of setState (encourage functional components with hooks)
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'noSetState';

export const noSetState = createRule<[], MessageIds>({
  name: 'no-set-state',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow usage of setState to encourage functional components with hooks',
    },
    messages: {
      noSetState: formatLLMMessage({
        icon: MessageIcons.MIGRATION,
        issueName: 'setState Usage',
        description: 'Usage of setState detected',
        severity: 'MEDIUM',
        fix: 'Convert to functional component with useState hook',
        documentationLink: 'https://react.dev/reference/react/useState',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, []>) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        // Check if this is a setState call
        if (
          node.callee.type === 'MemberExpression' &&
          node.callee.property.type === 'Identifier' &&
          node.callee.property.name === 'setState'
        ) {
          context.report({
            node: node.callee.property,
            messageId: 'noSetState',
            data: {
              methodName: 'setState',
              suggestion: 'Use useState hook in functional component',
            },
          });
        }
      },
    };
  },
});
