/**
 * ESLint Rule: aria-activedescendant-has-tabindex
 * Enforce that elements with aria-activedescendant have proper tabindex
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/aria-activedescendant-has-tabindex.md
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'missingTabIndex';

type RuleOptions = [];

const INHERENTLY_FOCUSABLE = new Set([
  'input', 'select', 'textarea', 'button', 'a', 'area'
]);

export const ariaActivedescendantHasTabindex = createRule<RuleOptions, MessageIds>({
  name: 'aria-activedescendant-has-tabindex',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that elements with aria-activedescendant have proper tabindex',
    },
    messages: {
      missingTabIndex: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing TabIndex for aria-activedescendant',
        description: 'Elements with aria-activedescendant must be tabbable',
        severity: 'HIGH',
        fix: 'Add tabIndex={0} or tabIndex={-1}',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/aria-activedescendant-has-tabindex.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;

        const element = node.name.name;

        // Check if element has aria-activedescendant
        const ariaActivedescendant = node.attributes.find(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'aria-activedescendant'
        );

        if (!ariaActivedescendant) return;

        // Check if element is inherently focusable
        if (INHERENTLY_FOCUSABLE.has(element)) return;

        // Check if element has explicit tabIndex
        const tabIndex = node.attributes.find(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name.type === 'JSXIdentifier' &&
          attr.name.name === 'tabIndex'
        );

        if (!tabIndex) {
          context.report({
            node: ariaActivedescendant,
            messageId: 'missingTabIndex',
          });
        }
      },
    };
  },
});

