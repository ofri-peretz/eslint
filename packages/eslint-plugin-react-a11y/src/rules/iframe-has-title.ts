/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: iframe-has-title
 * Enforce that iframes have a title attribute
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/iframe-has-title.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';

type MessageIds = 'missingTitle';

type RuleOptions = [];

export const iframeHasTitle = createRule<RuleOptions, MessageIds>({
  name: 'iframe-has-title',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/iframe-has-title.md',
      description: 'Enforce that iframes have a title attribute',
      wcag: 'WCAG 4.1.2',
    },
    messages: {
      missingTitle: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Iframe Missing Title',
        description: '<iframe> must have a unique title property',
        severity: 'HIGH',
        fix: 'Add title="Description of content"',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/iframe-has-title.md',
        wcag: 'WCAG 4.1.2',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'iframe') {
          return;
        }

        const hasTitle = node.attributes.some(
          (
            attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute,
          ): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'title' &&
            attr.value?.type === 'Literal' &&
            // Presence is not the requirement — a VALUE is.
            // an empty `title` announces nothing: the frame is still unlabelled in the
            typeof attr.value.value === 'string' &&
            attr.value.value.trim() !== '',
        );

        if (!hasTitle) {
          context.report({
            node,
            messageId: 'missingTitle',
          });
        }
      },
    };
  },
});
