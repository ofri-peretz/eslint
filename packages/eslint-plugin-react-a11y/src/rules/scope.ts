/**
 * ESLint Rule: scope
 * Enforce that scope prop is only used on th elements
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/scope.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'invalidScope';

type RuleOptions = [];

export const scope = createRule<RuleOptions, MessageIds>({
  name: 'scope',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that scope prop is only used on th elements',
    },
    messages: {
      invalidScope: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Invalid Scope Attribute',
        description: 'The scope attribute should only be used on <th> elements',
        severity: 'MEDIUM',
        fix: 'Remove the scope attribute',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/scope.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'scope') {
          return;
        }

        const parent = node.parent;
        if (parent && parent.type === 'JSXOpeningElement') {
          if (parent.name.type === 'JSXIdentifier' && parent.name.name !== 'th') {
            context.report({
              node,
              messageId: 'invalidScope',
            });
          }
        }
      },
    };
  },
});

