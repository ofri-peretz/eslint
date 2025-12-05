/**
 * ESLint Rule: aria-props
 * Enforce that ARIA attributes are valid
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/aria-props.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons, ARIA_ATTRIBUTES } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'invalidAriaProp';

type RuleOptions = [];

export const ariaProps = createRule<RuleOptions, MessageIds>({
  name: 'aria-props',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that ARIA attributes are valid',
    },
    messages: {
      invalidAriaProp: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Invalid ARIA Attribute',
        description: 'Attribute {{name}} is not a valid ARIA attribute',
        severity: 'HIGH',
        fix: 'Use a valid ARIA attribute (e.g., aria-label)',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/aria-props.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier') {
          return;
        }

        const name = node.name.name;
        if (name.startsWith('aria-') && !ARIA_ATTRIBUTES.has(name)) {
          context.report({
            node,
            messageId: 'invalidAriaProp',
            data: {
              name,
            },
          });
        }
      },
    };
  },
});

