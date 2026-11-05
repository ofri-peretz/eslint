/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-noninteractive-tabindex
 * Enforce that non-interactive elements do not have tabindex
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-tabindex.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { findAttribute, staticAttributeValue } from '../utils/jsx-static';

type MessageIds = 'noNoninteractiveTabindex';

type Options = {
  tags?: string[];
  roles?: string[];
  allowExpressionValues?: boolean;
};

type RuleOptions = [Options?];

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
  'textbox',
  'combobox',
  'listbox',
  'menu',
  'menubar',
  'radiogroup',
  'tab',
  'tablist',
  'tree',
  'treegrid',
  'grid',
  'gridcell',
  'row',
  'treeitem',
  'progressbar',
  'scrollbar',
  'slider',
  'spinbutton',
]);

const INTERACTIVE_ELEMENTS = new Set([
  'a',
  'button',
  'input',
  'select',
  'textarea',
]);

const DEFAULT_OPTIONS = {
  tags: [],
  roles: ['tabpanel'],
  allowExpressionValues: true,
};

/**
 * Check if element is interactive
 */
function isInteractiveElement(elementName: string): boolean {
  return INTERACTIVE_ELEMENTS.has(elementName);
}

/**
 * Check if role is interactive
 */
function isInteractiveRole(role: string, allowedRoles: string[]): boolean {
  return INTERACTIVE_ROLES.has(role) || allowedRoles.includes(role);
}

/**
 * Check if tabindex value is allowed on non-interactive elements
 * Only tabindex="-1" is allowed on non-interactive elements
 */
export function isAllowedTabindex(tabindex: string | number): boolean {
  const numValue =
    typeof tabindex === 'string' ? parseInt(tabindex, 10) : tabindex;
  return numValue === -1;
}

/** HTML-AAM `generic` elements: no semantics of their own. */
const GENERIC_ELEMENTS = new Set(['div', 'span']);

export const noNoninteractiveTabindex = createRule<RuleOptions, MessageIds>({
  name: 'no-noninteractive-tabindex',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/no-noninteractive-tabindex',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/no-noninteractive-tabindex.md',
      description: 'Enforce that non-interactive elements do not have tabindex',
      wcag: 'WCAG 2.4.3',
    },
    messages: {
      noNoninteractiveTabindex: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Non-interactive Element with TabIndex',
        description: 'Non-interactive elements should not have tabindex',
        severity: 'MEDIUM',
        fix: 'Remove tabindex or make element interactive',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-noninteractive-tabindex.md',
        wcag: 'WCAG 2.4.3',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
          roles: {
            type: 'array',
            items: { type: 'string' },
          },
          allowExpressionValues: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [DEFAULT_OPTIONS],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let tags: string[];
    let roles: string[];
    let allowExpressionValues: boolean;

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        ({
          tags = DEFAULT_OPTIONS.tags,
          roles = DEFAULT_OPTIONS.roles,
          allowExpressionValues = DEFAULT_OPTIONS.allowExpressionValues,
        } = {
          ...DEFAULT_OPTIONS,
          ...options,
        });
      },
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;

        const elementName = node.name.name;

        const tabindexAttr = findAttribute(node, 'tabIndex');
        // A bare `tabIndex` carries no number to judge.
        if (!tabindexAttr?.value) return;

        // Every static spelling (`"0"`, `{0}`, `{"0"}`, a conditional with
        // equal branches); a dynamic value is unknown.
        const tabindexValue = staticAttributeValue(tabindexAttr);
        if (tabindexValue === null) return;

        // Check if element is in allowed tags
        if (tags.includes(elementName)) return;

        // Check if element is inherently interactive
        if (isInteractiveElement(elementName)) return;

        const roleAttr = findAttribute(node, 'role');
        // `<div tabIndex="0">` / `<span tabIndex="0">` with no role is also the
        // keyboard-scrollable-region pattern WCAG 2.1.1 asks for: whether it is
        // a problem is a judgment, so that finding stays as it was (the plain
        // string spelling only) and is not extended to `{0}` and the others.
        if (
          !roleAttr &&
          GENERIC_ELEMENTS.has(elementName) &&
          tabindexAttr.value.type !== 'Literal'
        ) {
          return;
        }
        if (roleAttr) {
          const roleValue = staticAttributeValue(roleAttr);
          if (roleValue === null) {
            // A role the file cannot know may be interactive:
            // `allowExpressionValues` (default) leaves the element alone;
            // `false` judges it as the bare element.
            if (allowExpressionValues) return;
          } else if (isInteractiveRole(roleValue.trim(), roles)) {
            // If role is interactive or allowed, permit tabindex
            return;
          }
        }

        if (!isAllowedTabindex(tabindexValue)) {
          context.report({
            node: tabindexAttr,
            messageId: 'noNoninteractiveTabindex',
          });
        }
      },
    };
  },
});
