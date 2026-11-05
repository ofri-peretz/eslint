/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-aria-hidden-on-focusable
 * Enforce that aria-hidden="true" is not used on focusable elements
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-aria-hidden-on-focusable.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  attributeValue,
  findAttribute,
  intrinsicName,
  judgedValue,
  staticAttributeValue,
} from '../utils/jsx-static';

type MessageIds = 'ariaHiddenFocusable';

type RuleOptions = [];

/** Controls that take focus unless disabled. */
const FOCUSABLE_CONTROLS = new Set(['button', 'input', 'select', 'textarea']);

/**
 * Whether the element is in the tab order: a native control (not disabled,
 * not `type="hidden"`), a link (`a`/`area` with `href`), or any element with
 * a tabIndex >= 0. A negative tabIndex removes even a native control from the
 * tab order. A value the file cannot know is not proof of focusability.
 */
function isTabbable(
  node: TSESTree.JSXOpeningElement,
  element: string,
): boolean {
  const tabIndexAttr = findAttribute(node, 'tabIndex');
  if (tabIndexAttr) {
    const value = judgedValue(node, tabIndexAttr);
    if (value !== null) {
      const n = parseInt(value, 10);
      if (!isNaN(n)) return n >= 0;
    }
  }

  if (element === 'a' || element === 'area') {
    return findAttribute(node, 'href') !== undefined;
  }
  if (!FOCUSABLE_CONTROLS.has(element)) return false;

  if (
    element === 'input' &&
    staticAttributeValue(findAttribute(node, 'type'))?.toLowerCase() ===
      'hidden'
  ) {
    return false;
  }

  // `disabled`, `disabled={true}`, `disabled=""`: not focusable. A disabled
  // state the file cannot know is not proof the control is reachable.
  const disabledAttr = findAttribute(node, 'disabled');
  if (disabledAttr) {
    return attributeValue(disabledAttr) === 'false';
  }
  return true;
}

export const noAriaHiddenOnFocusable = createRule<RuleOptions, MessageIds>({
  name: 'no-aria-hidden-on-focusable',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/no-aria-hidden-on-focusable',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/no-aria-hidden-on-focusable.md',
      description:
        'Enforce that aria-hidden="true" is not used on focusable elements',
      wcag: 'WCAG 4.1.2',
    },
    messages: {
      ariaHiddenFocusable: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Hidden Focusable Element',
        description: 'Focusable element should not be aria-hidden',
        severity: 'HIGH',
        fix: 'Remove aria-hidden="true" or make element non-focusable',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-aria-hidden-on-focusable.md',
        wcag: 'WCAG 4.1.2',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;

        // `aria-hidden="true"`, `aria-hidden={true}` and the bare attribute
        // all hide; `"false"` and a dynamic value do not prove it.
        // On a component only `aria-hidden="true"`: see judgedValue.
        const ariaHidden = findAttribute(node, 'aria-hidden');
        if (!ariaHidden) return;
        const hidden = intrinsicName(node)
          ? attributeValue(ariaHidden)
          : judgedValue(node, ariaHidden);
        if (hidden !== 'true') return;

        if (isTabbable(node, node.name.name)) {
          context.report({
            node,
            messageId: 'ariaHiddenFocusable',
          });
        }
      },
    };
  },
});
