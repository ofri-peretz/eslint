/**
 * ESLint Rule: no-access-key
 * Enforce that accessKey attribute is not used
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-access-key.md
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noAccessKey';

type RuleOptions = [];

export const noAccessKey = createRule<RuleOptions, MessageIds>({
  name: 'no-access-key',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that accessKey attribute is not used',
    },
    messages: {
      noAccessKey: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'No Access Key',
        description: 'accessKey attribute is problematic for accessibility',
        severity: 'MEDIUM',
        fix: 'Remove accessKey attribute',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-access-key.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type === 'JSXIdentifier' && node.name.name === 'accessKey') {
          context.report({
            node,
            messageId: 'noAccessKey',
          });
        }
      },
    };
  },
});

