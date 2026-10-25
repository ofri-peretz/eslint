/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: media-has-caption
 * Enforce that media elements have captions
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/media-has-caption.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingCaption';

type Options = {
  audio?: string[];
  video?: string[];
  track?: string[];
};

type RuleOptions = [Options?];

export const mediaHasCaption = createRule<RuleOptions, MessageIds>({
  name: 'media-has-caption',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/media-has-caption',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/media-has-caption.md',
      description: 'Enforce that media elements have captions',
      wcag: 'WCAG 1.2.2',
    },
    messages: {
      missingCaption: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing Captions',
        description: '<{{element}}> must have a <track> for captions',
        severity: 'HIGH',
        fix: 'Add <track kind="captions" />',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/media-has-caption.md',
        wcag: 'WCAG 1.2.2',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          audio: { type: 'array', items: { type: 'string' } },
          video: { type: 'array', items: { type: 'string' } },
          track: { type: 'array', items: { type: 'string' } },
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
    let audioElements: Set<string>;
    let videoElements: Set<string>;
    let trackElements: Set<string>;

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        const {
          audio = [],
          video = [],
          track = [],
        } = options ?? ({} as Options);
        audioElements = new Set(['audio', ...audio]);
        videoElements = new Set(['video', ...video]);
        trackElements = new Set(['track', ...track]);
      },
      JSXElement(node: TSESTree.JSXElement) {
        const openingElement = node.openingElement;
        if (openingElement.name.type !== 'JSXIdentifier') return;

        const name = openingElement.name.name;
        if (!audioElements.has(name) && !videoElements.has(name)) return;

        // Check if muted is true for video (no captions needed if muted?) - arguably still needed for accessibility standards but often skipped in simplified rules.
        // W3C says captions needed for audio content.

        // Check children for track
        const hasCaption = node.children.some(
          (child: TSESTree.JSXChild): child is TSESTree.JSXElement => {
            if (child.type !== 'JSXElement') return false;
            const childName = child.openingElement.name;
            if (
              childName.type !== 'JSXIdentifier' ||
              !trackElements.has(childName.name)
            )
              return false;

            // Check kind attribute
            return child.openingElement.attributes.some(
              (
                attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute,
              ): attr is TSESTree.JSXAttribute =>
                attr.type === 'JSXAttribute' &&
                attr.name.type === 'JSXIdentifier' &&
                attr.name.name === 'kind' &&
                attr.value?.type === 'Literal' &&
                attr.value.type === 'Literal' &&
                (attr.value.value === 'captions' ||
                  attr.value.value === 'descriptions'),
            );
          },
        );

        if (!hasCaption) {
          context.report({
            node: openingElement,
            messageId: 'missingCaption',
            data: {
              element: name,
            },
          });
        }
      },
    };
  },
});
