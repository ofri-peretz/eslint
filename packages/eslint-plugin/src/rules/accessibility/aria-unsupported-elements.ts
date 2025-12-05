/**
 * ESLint Rule: aria-unsupported-elements
 * Enforce that elements that don't support ARIA roles, states, and properties do not contain them
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/aria-unsupported-elements.md
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons, ARIA_UNSUPPORTED_ELEMENTS } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'unsupportedAria';

type RuleOptions = [];

export const ariaUnsupportedElements = createRule<RuleOptions, MessageIds>({
  name: 'aria-unsupported-elements',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that elements that don\'t support ARIA roles, states, and properties do not contain them',
    },
    messages: {
      unsupportedAria: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Unsupported ARIA',
        description: '<{{element}}> should not have ARIA attributes',
        severity: 'MEDIUM',
        fix: 'Remove ARIA attributes from this element',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/aria-unsupported-elements.md',
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
        if (!ARIA_UNSUPPORTED_ELEMENTS.has(element)) return;

        const hasAria = node.attributes.some(
            (attr) => 
            attr.type === 'JSXAttribute' && 
            attr.name.type === 'JSXIdentifier' && 
            (attr.name.name.startsWith('aria-') || attr.name.name === 'role')
        );

        if (hasAria) {
            context.report({
                node,
                messageId: 'unsupportedAria',
                data: {
                    element
                }
            });
        }
      },
    };
  },
});

