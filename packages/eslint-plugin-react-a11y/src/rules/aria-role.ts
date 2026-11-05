/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: aria-role
 * Enforce that elements with ARIA roles have valid values
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/aria-role.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  ARIA_ROLES,
  AST_NODE_TYPES,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { intrinsicName, staticAttributeValue } from '../utils/jsx-static';

type MessageIds = 'invalidRole';

type Options = {
  allowedInvalidRoles?: string[];
  ignoreNonDOM?: boolean;
};

type RuleOptions = [Options?];

export const ariaRole = createRule<RuleOptions, MessageIds>({
  name: 'aria-role',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/aria-role',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/aria-role.md',
      description: 'Enforce that elements with ARIA roles have valid values',
      wcag: 'WCAG 4.1.1',
    },
    messages: {
      invalidRole: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Invalid ARIA Role',
        description: 'Role "{{role}}" is not a valid ARIA role',
        severity: 'HIGH',
        fix: 'Use a valid ARIA role (e.g., button, alert)',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/aria-role.md',
        wcag: 'WCAG 4.1.1',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowedInvalidRoles: {
            type: 'array',
            items: { type: 'string' },
          },
          ignoreNonDOM: {
            type: 'boolean',
          },
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
    let allowedInvalidRoles: string[];
    let ignoreNonDOM: boolean;

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        ({ allowedInvalidRoles = [], ignoreNonDOM = false } =
          options ?? ({} as Options));
      },
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'role') {
          return;
        }

        // `ignoreNonDOM`: a component's `role` prop is not a DOM attribute.
        if (
          ignoreNonDOM &&
          node.parent.type === AST_NODE_TYPES.JSXOpeningElement &&
          !intrinsicName(node.parent)
        ) {
          return;
        }

        // Every static spelling (`"x"`, `{"x"}`, `` {`x`} ``, a conditional
        // with equal branches); a dynamic role cannot be checked.
        const value = staticAttributeValue(node);
        if (value === null) return;

        // Surrounding whitespace is not a token, and `role=""` names no role.
        const roles = value.trim().split(/\s+/).filter(Boolean);

        for (const role of roles) {
          if (!ARIA_ROLES.has(role) && !allowedInvalidRoles.includes(role)) {
            context.report({
              node,
              messageId: 'invalidRole',
              data: {
                role,
              },
            });
          }
        }
      },
    };
  },
});
