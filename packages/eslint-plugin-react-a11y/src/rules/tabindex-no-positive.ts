/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: tabindex-no-positive
 * Enforce that tabIndex is not positive
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/tabindex-no-positive.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { staticAttributeValue } from '../utils/jsx-static';

type MessageIds = 'avoidPositiveTabIndex';

type RuleOptions = [];

export const tabindexNoPositive = createRule<RuleOptions, MessageIds>({
  name: 'tabindex-no-positive',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/tabindex-no-positive',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/tabindex-no-positive.md',
      description: 'Enforce that tabIndex is not positive',
      wcag: 'WCAG 2.4.3',
    },
    messages: {
      avoidPositiveTabIndex: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Positive TabIndex',
        description:
          'Positive tabIndex values should be avoided as they mess up the focus order',
        severity: 'MEDIUM',
        fix: 'Use tabIndex="0" or tabIndex="-1"',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/tabindex-no-positive.md',
        wcag: 'WCAG 2.4.3',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        // React renders the lowercase `tabindex` too, and HTML attribute
        // names are case-insensitive.
        if (
          node.name.type !== 'JSXIdentifier' ||
          (node.name.name !== 'tabIndex' && node.name.name !== 'tabindex')
        ) {
          return;
        }

        // `"1"`, `{1}`, `{"1"}`, `` {`1`} `` and `{flag ? 1 : 1}` all write
        // the same value; a dynamic one is unknown and stays silent.
        const value = staticAttributeValue(node);
        if (value === null) return;
        const numericValue = parseInt(value, 10);
        if (!isNaN(numericValue) && numericValue > 0) {
          context.report({
            node,
            messageId: 'avoidPositiveTabIndex',
          });
        }
      },
    };
  },
});
