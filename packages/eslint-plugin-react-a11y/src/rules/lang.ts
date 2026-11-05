/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: lang
 * Enforce that lang attribute has a valid value
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/lang.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { staticAttributeValue } from '../utils/jsx-static';

type MessageIds = 'invalidLang';

type RuleOptions = [];

export const lang = createRule<RuleOptions, MessageIds>({
  name: 'lang',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/lang',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/lang.md',
      description: 'Enforce that lang attribute has a valid value',
      wcag: 'WCAG 3.1.1',
    },
    messages: {
      invalidLang: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Invalid Lang Value',
        description: 'lang attribute must have a valid ISO 639-1 language code',
        severity: 'HIGH',
        fix: 'Use a valid language code (e.g., "en", "es")',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/lang.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'lang') {
          return;
        }

        // `lang="en"`, `lang={"en"}` and `` lang={`en`} `` write the same
        // value; one the file cannot see is not a finding.
        if (node.value === null) return;
        const value = staticAttributeValue(node);
        if (value === null) return;

        // The primary subtag of a BCP 47 tag is a language: 2-3 letters
        // (`en`, `en-US`). Digits, `en_US` or a word are not a tag.
        const langCode = value.split('-')[0];

        if (!/^[a-z]{2,3}$/i.test(langCode)) {
          context.report({
            node,
            messageId: 'invalidLang',
          });
        }
      },
    };
  },
});
