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

type MessageIds = 'missingTabIndex';

type Options = {
  tabbable?: string[];
};

type RuleOptions = [Options?];

const INTERACTIVE_HANDLERS = new Set([
    'onClick', 'onKeyPress', 'onKeyDown', 'onKeyUp', 'onMouseDown', 'onMouseUp'
]);

const NATIVE_INTERACTIVE_ELEMENTS = new Set([
    'a', 'button', 'input', 'select', 'textarea', 'area', 'option', 'summary'
]);

export const interactiveSupportsFocus = createRule<RuleOptions, MessageIds>({
  name: 'interactive-supports-focus',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/interactive-supports-focus.md',
      description: 'Enforce that elements with interactive handlers are focusable',
      cwe: 'CWE-252',
      cvss: 7.5,
    },
    messages: {
      missingTabIndex: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Interactive Element Not Focusable',
        description: 'Interactive element must be focusable',
        severity: 'HIGH',
        fix: 'Add tabIndex="0"',
        documentationLink: 'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/interactive-supports-focus.md',
        cwe: 'CWE-252'
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
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>, [options = {} as Options]) {
    const { tabbable = [] } = options ?? {} as Options;

    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;
        const element = node.name.name;

        // Skip native interactive elements and configured tabbable elements
        if (NATIVE_INTERACTIVE_ELEMENTS.has(element) || tabbable.includes(element)) return;

        const hasInteractiveHandler = node.attributes.some((attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute): attr is TSESTree.JSXAttribute => 
            attr.type === 'JSXAttribute' && 
            attr.name.type === 'JSXIdentifier' && 
            INTERACTIVE_HANDLERS.has(attr.name?.name ?? '')
        );

        if (!hasInteractiveHandler) return;

        // Elements with interactive ARIA roles inherit focus management from the AT/framework
        // (e.g. role="button" gets Tab focus from the browser's keyboard model)
        const INTERACTIVE_ARIA_ROLES = new Set([
          'button', 'link', 'checkbox', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
          'option', 'radio', 'searchbox', 'switch', 'tab', 'textbox', 'treeitem',
          'combobox', 'gridcell', 'listbox', 'slider', 'spinbutton',
        ]);

        const roleAttr = node.attributes.find(
          (attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'role'
        );
        if (roleAttr) {
          const roleValue =
            roleAttr.value?.type === 'Literal' ? String(roleAttr.value.value) : null;
          if (roleValue && INTERACTIVE_ARIA_ROLES.has(roleValue)) return;
        }

        // Check tabIndex
        const tabIndex = node.attributes.find((attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute): attr is TSESTree.JSXAttribute => 
            attr.type === 'JSXAttribute' && 
            attr.name.type === 'JSXIdentifier' && 
            attr.name.name === 'tabIndex'
        );

        if (!tabIndex) {
             context.report({
                 node,
                 messageId: 'missingTabIndex',
             });
        }
      },
    };
  },
});
