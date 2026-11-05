/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: click-events-have-key-events
 * Enforce that onClick is accompanied by keyboard events
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/click-events-have-key-events.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { findAttribute, intrinsicName, judgedValue } from '../utils/jsx-static';

type MessageIds = 'missingKeyboardEvent';

type RuleOptions = [];

// WAI-ARIA widget roles: on a component they keep the exemption the rule
// always gave them (see below).
const INTERACTIVE_ARIA_ROLES = new Set([
  'button',
  'link',
  'checkbox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'searchbox',
  'switch',
  'tab',
  'textbox',
  'treeitem',
  'combobox',
  'gridcell',
  'listbox',
  'slider',
  'spinbutton',
]);

export const clickEventsHaveKeyEvents = createRule<RuleOptions, MessageIds>({
  name: 'click-events-have-key-events',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/click-events-have-key-events',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/click-events-have-key-events.md',
      description: 'Enforce that onClick is accompanied by keyboard events',
      wcag: 'WCAG 2.1.1',
    },
    messages: {
      missingKeyboardEvent: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing Keyboard Listener',
        description:
          'onClick must be accompanied by onKeyUp, onKeyDown, or onKeyPress',
        severity: 'MEDIUM',
        fix: 'Add onKeyDown/onKeyUp handler',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/click-events-have-key-events.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const hasOnClick = node.attributes.some(
          (
            attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute,
          ): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'onClick',
        );

        if (!hasOnClick) return;

        const hasKeyboardEvent = node.attributes.some(
          (
            attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute,
          ): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            ['onKeyUp', 'onKeyDown', 'onKeyPress'].includes(attr.name.name),
        );

        // Native interactive elements fire click from the keyboard themselves.
        // An <a> is one only with an href; an ARIA role adds no key handling
        // (WAI-ARIA APG: the author implements Enter/Space).
        const tagName =
          node.name.type === 'JSXIdentifier' ? node.name.name : null;
        const isInteractive =
          ['button', 'input', 'select', 'textarea', 'option'].includes(
            tagName || '',
          ) ||
          (tagName === 'a' && findAttribute(node, 'href') !== undefined);
        if (isInteractive) return;

        // A component with an interactive role (`<Link component="button"
        // role="link">`) may render a native control that handles keys
        // itself: reporting it is a guess, so the exemption it always had
        // stays for components. On an intrinsic element the role adds none.
        if (
          intrinsicName(node) === null &&
          INTERACTIVE_ARIA_ROLES.has(
            judgedValue(node, findAttribute(node, 'role')) ?? '',
          )
        )
          return;

        if (!hasKeyboardEvent) {
          context.report({
            node,
            messageId: 'missingKeyboardEvent',
          });
        }
      },
    };
  },
});
