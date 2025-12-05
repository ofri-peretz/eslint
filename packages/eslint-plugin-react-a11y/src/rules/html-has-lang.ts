/**
 * ESLint Rule: html-has-lang
 * Enforce that html element has lang attribute
 * 
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/html-has-lang.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingLang';

type RuleOptions = [];

export const htmlHasLang = createRule<RuleOptions, MessageIds>({
  name: 'html-has-lang',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce that html element has lang attribute',
    },
    messages: {
      missingLang: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing Lang Attribute',
        description: '<html> element must have a lang attribute',
        severity: 'CRITICAL',
        fix: 'Add lang="en" (or appropriate language code)',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/html-has-lang.md',
        cwe: 'CWE-252'
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type === 'JSXIdentifier' && node.name.name === 'html') {
          const hasLang = node.attributes.some(
            (attr) =>
              attr.type === 'JSXAttribute' &&
              attr.name.type === 'JSXIdentifier' &&
              attr.name.name === 'lang' &&
              attr.value
          );

          if (!hasLang) {
            context.report({
              node,
              messageId: 'missingLang',
            });
          }
        }
      },
    };
  },
});

