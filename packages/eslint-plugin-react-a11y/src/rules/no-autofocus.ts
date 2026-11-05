/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-autofocus
 * Enforce that autoFocus prop is not used on elements
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-autofocus.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { attributeValue, intrinsicName } from '../utils/jsx-static';

type MessageIds = 'noAutoFocus';

type Options = {
  ignoreNonDOM?: boolean;
};

type RuleOptions = [Options?];

export const noAutofocus = createRule<RuleOptions, MessageIds>({
  name: 'no-autofocus',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/no-autofocus',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/no-autofocus.md',
      description: 'Enforce that autoFocus prop is not used on elements',
      wcag: 'WCAG 2.4.3',
    },
    messages: {
      noAutoFocus: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'No AutoFocus',
        description:
          'autoFocus attribute can be confusing for screen reader users',
        severity: 'MEDIUM',
        fix: 'Remove autoFocus attribute',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-autofocus.md',
        wcag: 'WCAG 2.4.3',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreNonDOM: {
            type: 'boolean',
            default: false,
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      ignoreNonDOM: false,
    },
  ],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let ignoreNonDOM: boolean;

    return {
      before() {
        ignoreNonDOM = currentOptions()[0]?.ignoreNonDOM === true;
      },
      JSXAttribute(node: TSESTree.JSXAttribute) {
        // React spells it autoFocus; HTML attribute names are
        // case-insensitive, so autofocus reaches the DOM too.
        if (
          node.name.type !== 'JSXIdentifier' ||
          node.name.name.toLowerCase() !== 'autofocus'
        )
          return;

        // {undefined} and {false} focus nothing.
        if (attributeValue(node) === undefined) return;
        if (
          node.value?.type === 'JSXExpressionContainer' &&
          node.value.expression.type === 'Literal' &&
          node.value.expression.value === false
        )
          return;

        // ignoreNonDOM: a custom component's prop may never reach the DOM.
        if (
          ignoreNonDOM &&
          node.parent.type === 'JSXOpeningElement' &&
          !intrinsicName(node.parent)
        )
          return;

        context.report({
          node,
          messageId: 'noAutoFocus',
        });
      },
    };
  },
});
