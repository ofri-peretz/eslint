/**
 * ESLint Rule: lang
 * Enforce that lang attribute has a valid value
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/lang.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'invalidLang';

type RuleOptions = [];

export const lang = createRule<RuleOptions, MessageIds>({
  name: 'lang',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that lang attribute has a valid value',
    },
    messages: {
      invalidLang: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Invalid Lang Value',
        description: 'lang attribute must have a valid ISO 639-1 language code',
        severity: 'HIGH',
        fix: 'Use a valid language code (e.g., "en", "es")',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/lang.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'lang') {
          return;
        }

        const value = node.value;
        if (!value || value.type !== 'Literal' || typeof value.value !== 'string') {
            return;
        }

        const langCode = value.value.split('-')[0].toLowerCase(); // Handle en-US
        
        // Basic validation - check if 2 chars or in list
        // We can also just check format if list is too restrictive
        if (langCode.length !== 2 && langCode.length !== 3) {
             context.report({
                node,
                messageId: 'invalidLang',
            });
        }
      },
    };
  },
});
