/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: role-supports-aria-props
 * Enforce that elements with roles contain only supported ARIA properties
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/role-supports-aria-props.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  ROLE_SUPPORTED_ARIA_PROPS,
  GLOBAL_ARIA_PROPS,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  findAttribute,
  inputImplicitRole,
  staticAttributeValue,
} from '../utils/jsx-static';

type MessageIds = 'unsupportedAriaProp';

type RuleOptions = [];

// Implicit roles for HTML elements
const IMPLICIT_ROLES: Record<string, string> = {
  article: 'article',
  aside: 'complementary',
  body: 'document',
  button: 'button',
  datalist: 'listbox',
  details: 'group',
  dialog: 'dialog',
  figure: 'figure',
  form: 'form',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  hr: 'separator',
  img: 'img',
  li: 'listitem',
  link: 'link',
  main: 'main',
  menu: 'list',
  nav: 'navigation',
  ol: 'list',
  option: 'option',
  progress: 'progressbar',
  section: 'region',
  select: 'listbox',
  summary: 'button',
  table: 'table',
  tbody: 'rowgroup',
  textarea: 'textbox',
  tfoot: 'rowgroup',
  thead: 'rowgroup',
  tr: 'row',
  ul: 'list',
};

/**
 * The implicit role an element gets from HTML-AAM, or `''` when it has none
 * this rule can know: an `a`/`area` without `href` is generic, an `input`'s
 * role follows its `type` (a missing `type` is text; a `list` makes the text
 * types a combobox; a dynamic `type` is unknown).
 */
function implicitRole(node: TSESTree.JSXOpeningElement, name: string): string {
  if (name === 'a' || name === 'area') {
    return findAttribute(node, 'href') ? 'link' : '';
  }
  if (name === 'input') return inputImplicitRole(node);
  return IMPLICIT_ROLES[name] || '';
}

export const roleSupportsAriaProps = createRule<RuleOptions, MessageIds>({
  name: 'role-supports-aria-props',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/role-supports-aria-props',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/role-supports-aria-props.md',
      description:
        'Enforce that elements with roles contain only supported ARIA properties',
      wcag: 'WCAG 4.1.2',
    },
    messages: {
      unsupportedAriaProp: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Unsupported ARIA Property',
        description: 'Role "{{role}}" does not support property "{{prop}}"',
        severity: 'HIGH',
        fix: 'Remove unsupported ARIA property or change role',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/role-supports-aria-props.md',
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

        const elementName = node.name.name;
        let role = '';

        // Explicit role, in any static spelling; a role that is present but
        // dynamic is unknown.
        const roleAttr = findAttribute(node, 'role');
        if (roleAttr) {
          const explicitRole = staticAttributeValue(roleAttr);
          if (explicitRole === null) return;
          role = explicitRole.trim();
        } else {
          role = implicitRole(node, elementName);
        }

        if (!role || !ROLE_SUPPORTED_ARIA_PROPS[role]) return;

        const roleSupportedProps = ROLE_SUPPORTED_ARIA_PROPS[role];
        // Global ARIA props are valid on every element regardless of role
        const supportedProps = new Set([
          ...roleSupportedProps,
          ...GLOBAL_ARIA_PROPS,
        ]);

        // Check all aria-* attributes
        for (const attr of node.attributes) {
          if (
            attr.type !== 'JSXAttribute' ||
            attr.name.type !== 'JSXIdentifier'
          )
            continue;

          const attrName = attr.name.name;
          if (!attrName.startsWith('aria-')) continue;

          if (!supportedProps.has(attrName)) {
            context.report({
              node: attr,
              messageId: 'unsupportedAriaProp',
              data: {
                role,
                prop: attrName,
              },
            });
          }
        }
      },
    };
  },
});
