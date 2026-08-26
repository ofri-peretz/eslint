/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

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
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/html-has-lang.md',
      description: 'Enforce that html element has lang attribute',
      wcag: 'WCAG 3.1.1',
    },
    messages: {
      missingLang: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing Lang Attribute',
        description: '<html> element must have a lang attribute',
        severity: 'HIGH',
        fix: 'Add lang="en" (or appropriate language code)',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/html-has-lang.md',
        wcag: 'WCAG 3.1.1'
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
            (attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute): attr is TSESTree.JSXAttribute =>
              attr.type === 'JSXAttribute' &&
              attr.name.type === 'JSXIdentifier' &&
              attr.name.name === 'lang' &&
              attr.value?.type === 'Literal' &&
              // Presence is not the requirement — a VALUE is.
              // an empty `lang` names no language: the screen reader still has to guess,
              typeof attr.value.value === 'string' &&
              attr.value.value.trim() !== ''
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

