/**
 * ESLint Rule: no-autofocus
 * Enforce that autoFocus prop is not used on elements
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-autofocus.md
 */
import type { TSESLint, TSESTree } from '@forge-js/eslint-plugin-utils';
import { formatLLMMessage, MessageIcons } from '@forge-js/eslint-plugin-utils';
import { createRule } from '@forge-js/eslint-plugin-utils';

type MessageIds = 'noAutoFocus';

type Options = {
  ignoreNonDOM?: boolean;
};

type RuleOptions = [Options?];

export const noAutofocus = createRule<RuleOptions, MessageIds>({
  name: 'no-autofocus',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that autoFocus prop is not used on elements',
    },
    messages: {
      noAutoFocus: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'No AutoFocus',
        description: 'autoFocus attribute can be confusing for screen reader users',
        severity: 'MEDIUM',
        fix: 'Remove autoFocus attribute',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-autofocus.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreNonDOM: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreNonDOM: false,
    },
  ],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type === 'JSXIdentifier' && node.name.name === 'autoFocus') {
          context.report({
            node,
            messageId: 'noAutoFocus',
          });
        }
      },
    };
  },
});

