/**
 * ESLint Rule: no-aria-hidden-on-focusable
 * Enforce that aria-hidden="true" is not used on focusable elements
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-aria-hidden-on-focusable.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'ariaHiddenFocusable';

type RuleOptions = [];

const FOCUSABLE_ELEMENTS = ['a', 'button', 'input', 'select', 'textarea', 'area'];

export const noAriaHiddenOnFocusable = createRule<RuleOptions, MessageIds>({
  name: 'no-aria-hidden-on-focusable',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that aria-hidden="true" is not used on focusable elements',
    },
    messages: {
      ariaHiddenFocusable: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Hidden Focusable Element',
        description: 'Focusable element should not be aria-hidden',
        severity: 'HIGH',
        fix: 'Remove aria-hidden="true" or make element non-focusable',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-aria-hidden-on-focusable.md',
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
        
        // Check for aria-hidden="true"
        const ariaHidden = node.attributes.find(attr => 
            attr.type === 'JSXAttribute' && 
            attr.name.type === 'JSXIdentifier' && 
            attr.name.name === 'aria-hidden'
        );

        if (!ariaHidden || ariaHidden.type !== 'JSXAttribute' || !ariaHidden.value || ariaHidden.value.type !== 'Literal' || ariaHidden.value.value !== 'true') {
            return;
        }

        const element = node.name.name;
        let isFocusable = FOCUSABLE_ELEMENTS.includes(element);
        
        // Check tabIndex
        const tabIndex = node.attributes.find(attr => 
            attr.type === 'JSXAttribute' && 
            attr.name.type === 'JSXIdentifier' && 
            attr.name.name === 'tabIndex'
        );
        
        if (tabIndex && tabIndex.type === 'JSXAttribute' && tabIndex.value && tabIndex.value.type === 'Literal') {
            const val = parseInt(String(tabIndex.value.value), 10);
            if (!isNaN(val) && val >= 0) {
                isFocusable = true;
            }
        }

        if (isFocusable) {
            context.report({
                node,
                messageId: 'ariaHiddenFocusable',
            });
        }
      },
    };
  },
});

