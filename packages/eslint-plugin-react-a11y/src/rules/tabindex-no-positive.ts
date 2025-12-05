/**
 * ESLint Rule: tabindex-no-positive
 * Enforce that tabIndex is not positive
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/tabindex-no-positive.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'avoidPositiveTabIndex';

type RuleOptions = [];

export const tabindexNoPositive = createRule<RuleOptions, MessageIds>({
  name: 'tabindex-no-positive',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that tabIndex is not positive',
    },
    messages: {
      avoidPositiveTabIndex: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Positive TabIndex',
        description: 'Positive tabIndex values should be avoided as they mess up the focus order',
        severity: 'MEDIUM',
        fix: 'Use tabIndex="0" or tabIndex="-1"',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/tabindex-no-positive.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'tabIndex') {
          return;
        }

        const value = node.value;
        if (!value) return;

        if (value.type === 'Literal') {
          const numericValue = parseInt(String(value.value), 10);
          if (!isNaN(numericValue) && numericValue > 0) {
            context.report({
              node,
              messageId: 'avoidPositiveTabIndex',
            });
          }
        }
        // Note: We cannot easily check dynamic values without type checking, but we could try basic expression analysis if needed.
        // For now, literal check is sufficient for most cases.
      },
    };
  },
});

