/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: interactive-supports-focus
 * Enforce that interactive elements are focusable
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/interactive-supports-focus.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  DYNAMIC,
  attributeValue,
  findAttribute,
  intrinsicName,
  staticAttributeValue,
} from '../utils/jsx-static';

type MessageIds = 'missingTabIndex';

type Options = {
  tabbable?: string[];
};

type RuleOptions = [Options?];

const INTERACTIVE_HANDLERS = new Set([
  'onClick',
  'onKeyPress',
  'onKeyDown',
  'onKeyUp',
  'onMouseDown',
  'onMouseUp',
]);

/** Elements the browser already puts in the focus order. */
const NATIVE_FOCUSABLE_ELEMENTS = new Set([
  'button',
  'input',
  'select',
  'textarea',
  'option',
  'summary',
]);

/** WAI-ARIA 1.2 widget roles: an element with one is operated by the user. */
const INTERACTIVE_ROLES = new Set([
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

export const interactiveSupportsFocus = createRule<RuleOptions, MessageIds>({
  name: 'interactive-supports-focus',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/interactive-supports-focus',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/interactive-supports-focus.md',
      description:
        'Enforce that elements with interactive handlers are focusable',
      wcag: 'WCAG 2.1.1',
    },
    messages: {
      missingTabIndex: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Interactive Element Not Focusable',
        description: 'Interactive element must be focusable',
        severity: 'HIGH',
        fix: 'Add tabIndex="0"',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/interactive-supports-focus.md',
        wcag: 'WCAG 2.1.1',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          tabbable: { type: 'array', items: { type: 'string' } },
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
    let tabbable: string[];

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        ({ tabbable = [] } = options ?? ({} as Options));
      },
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        const element = intrinsicName(node);
        if (!element) return;

        // Natively focusable: a, area only with an href.
        if (
          NATIVE_FOCUSABLE_ELEMENTS.has(element) ||
          ((element === 'a' || element === 'area') &&
            findAttribute(node, 'href') !== undefined)
        )
          return;

        // The contract covers elements the author made interactive: an
        // interactive WAI-ARIA role. Role-less elements belong to
        // no-static-element-interactions; role presentation is the opt-out.
        const role = staticAttributeValue(findAttribute(node, 'role'));
        if (role === null || !INTERACTIVE_ROLES.has(role.trim())) return;

        const hasInteractiveHandler = node.attributes.some(
          (attr) =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            INTERACTIVE_HANDLERS.has(attr.name.name),
        );
        if (!hasInteractiveHandler) return;

        // Disabled or hidden from assistive technology: nothing to reach.
        if (
          staticAttributeValue(findAttribute(node, 'aria-disabled')) ===
            'true' ||
          staticAttributeValue(findAttribute(node, 'aria-hidden')) === 'true'
        )
          return;

        // An ARIA role never makes an element focusable (WAI-ARIA 1.2): it
        // needs a tabIndex, and a role listed in `tabbable` needs one >= 0.
        // tabIndex={undefined} renders no attribute.
        const tabIndex = findAttribute(node, 'tabIndex');
        const value = tabIndex ? attributeValue(tabIndex) : undefined;
        if (value === undefined) {
          context.report({ node, messageId: 'missingTabIndex' });
          return;
        }
        if (
          value !== DYNAMIC &&
          tabbable.includes(role.trim()) &&
          Number(value) < 0
        ) {
          context.report({ node, messageId: 'missingTabIndex' });
        }
      },
    };
  },
});
