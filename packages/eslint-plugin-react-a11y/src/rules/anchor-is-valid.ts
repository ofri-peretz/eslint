/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: anchor-is-valid
 * Enforce that anchors are valid, navigable elements
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-is-valid.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { findAttribute, staticAttributeValue } from '../utils/jsx-static';

type MessageIds = 'invalidHref' | 'noHref' | 'preferButton';

type Options = {
  components?: string[];
  specialLink?: string[];
  aspects?: string[];
};

type RuleOptions = [Options?];

const ALL_ASPECTS = ['noHref', 'invalidHref', 'preferButton'];

export const anchorIsValid = createRule<RuleOptions, MessageIds>({
  name: 'anchor-is-valid',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/anchor-is-valid',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/anchor-is-valid.md',
      description: 'Enforce that anchors are valid, navigable elements',
      wcag: 'WCAG 2.4.4',
    },
    messages: {
      noHref: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Anchor Missing Href',
        description: 'Anchor missing href attribute',
        severity: 'HIGH',
        fix: 'Add href attribute or use <button>',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-is-valid.md',
      }),
      invalidHref: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Invalid Href',
        description: 'Href value is not a valid URL',
        severity: 'HIGH',
        fix: 'Provide a valid URL or use <button>',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-is-valid.md',
      }),
      preferButton: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Prefer Button',
        description: 'Anchor used as a button',
        severity: 'HIGH',
        fix: 'Use <button> element for actions',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/anchor-is-valid.md',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          components: { type: 'array', items: { type: 'string' } },
          specialLink: { type: 'array', items: { type: 'string' } },
          aspects: { type: 'array', items: { type: 'string' } },
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
    let specialLink: string[];
    let anchors: Set<string>;
    let aspects: Set<string>;

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        ({ components = [], specialLink = [] } = options || {});
        anchors = new Set(['a', ...components]);
        // `aspects` narrows the checks; omitted or empty, all three are on.
        const chosen = options?.aspects ?? [];
        aspects = new Set(chosen.length > 0 ? chosen : ALL_ASPECTS);
      },
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (
          node.name.type !== 'JSXIdentifier' ||
          !anchors.has(node.name.name)
        ) {
          return;
        }

        // The destination: `href`, or an attribute `specialLink` names
        // (React Router's `to`).
        const hrefs = node.attributes.filter(
          (
            attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute,
          ): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            (attr.name.name === 'href' || specialLink.includes(attr.name.name)),
        );
        const onClick = findAttribute(node, 'onClick');

        // A click handler on an anchor with no real destination is a button
        // (preferButton); with that aspect off, the anchor falls to the
        // noHref / invalidHref aspect it fails.
        const asButton = Boolean(onClick) && aspects.has('preferButton');

        if (hrefs.length === 0) {
          if (asButton) {
            context.report({ node, messageId: 'preferButton' });
          } else if (aspects.has('noHref')) {
            context.report({ node, messageId: 'noHref' });
          }
          return;
        }

        // `#` and a `javascript:` URL go nowhere, however the value is
        // spelled; a value the file cannot see is not a finding.
        const goesNowhere = hrefs.some((attr) => {
          const value = staticAttributeValue(attr);
          return (
            value !== null &&
            attr.value !== null &&
            (value === '#' || /^\W*?javascript:/i.test(value))
          );
        });
        if (!goesNowhere) return;
        if (asButton) {
          context.report({ node, messageId: 'preferButton' });
        } else if (aspects.has('invalidHref')) {
          context.report({ node, messageId: 'invalidHref' });
        }
      },
    };
  },
});
