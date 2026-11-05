/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: img-redundant-alt
 * Enforce img alt attribute does not contain redundant words
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/img-redundant-alt.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  attributeValue,
  DYNAMIC,
  findAttribute,
  staticAttributeValue,
} from '../utils/jsx-static';

type MessageIds = 'redundantAlt';

type Options = {
  components?: string[];
  words?: string[];
};

type RuleOptions = [Options?];

const DEFAULT_REDUNDANT_WORDS = ['image', 'photo', 'picture'];
const DEFAULT_COMPONENTS = ['img'];

export const imgRedundantAlt = createRule<RuleOptions, MessageIds>({
  name: 'img-redundant-alt',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/img-redundant-alt',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/img-redundant-alt.md',
      description: 'Enforce img alt attribute does not contain redundant words',
      wcag: 'WCAG 1.1.1',
    },
    messages: {
      redundantAlt: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Redundant Alt Text',
        description:
          'Alt text should not contain redundant words like "{{word}}"',
        severity: 'LOW',
        fix: 'Remove redundant word "{{word}}" from alt text',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/img-redundant-alt.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          components: { type: 'array', items: { type: 'string' } },
          words: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{}],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let components: string[];
    let words: string[];
    let redundantWords: string[];

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        const { components: extraComponents = [], words: extraWords = [] } =
          options ?? ({} as Options);
        // Both options ADD to the defaults (the jsx-a11y contract): naming an
        // `Image` component does not stop `<img>` being checked, and an extra
        // word does not drop "image" / "photo" / "picture".
        components = [...DEFAULT_COMPONENTS, ...extraComponents];
        words = [...DEFAULT_REDUNDANT_WORDS, ...extraWords];
        redundantWords = words.map((word: string) => word.toLowerCase());
      },
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;

        const elementName = node.name.name;
        if (!components.includes(elementName)) return;

        // A hidden image is never announced. `aria-hidden` is spelled bare,
        // `"true"` or `{true}`; one the file cannot see is not a finding.
        const ariaHidden = findAttribute(node, 'aria-hidden');
        if (ariaHidden) {
          const v = attributeValue(ariaHidden);
          if (v === DYNAMIC || v === 'true') return;
        }

        const altAttr = findAttribute(node, 'alt');
        const altValue = staticAttributeValue(altAttr);
        if (!altAttr || altAttr.value === null || altValue === null) return;

        const altLower = altValue.toLowerCase();

        // Check for redundant words (exact matches)
        for (const word of redundantWords) {
          // Check for whole word matches (not partial)
          const regex = new RegExp(
            `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
            'i',
          );
          if (regex.test(altLower)) {
            context.report({
              node: altAttr,
              messageId: 'redundantAlt',
              data: {
                word,
              },
            });
            break; // Only report once per alt attribute
          }
        }
      },
    };
  },
});
