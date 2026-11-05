/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: role-has-required-aria-props
 * Enforce that elements with ARIA roles have all required ARIA attributes
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/role-has-required-aria-props.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  formatLLMMessage,
  MessageIcons,
  ARIA_REQUIRED_PROPS,
} from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import {
  findAttribute,
  intrinsicName,
  judgedValue,
  staticAttributeValue,
} from '../utils/jsx-static';

type MessageIds = 'missingRequiredProp';

type RuleOptions = [];

export const roleHasRequiredAriaProps = createRule<RuleOptions, MessageIds>({
  name: 'role-has-required-aria-props',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/role-has-required-aria-props',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/role-has-required-aria-props.md',
      description:
        'Enforce that elements with ARIA roles have all required ARIA attributes',
      wcag: 'WCAG 4.1.2',
    },
    messages: {
      missingRequiredProp: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Missing Required ARIA Prop',
        description: 'Role "{{role}}" requires attribute "{{prop}}"',
        severity: 'HIGH',
        fix: 'Add the missing attribute: {{prop}}',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/role-has-required-aria-props.md',
        wcag: 'WCAG 4.1.2',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        // Every static spelling of `role`; a dynamic one cannot be checked.
        // On a component only `role="x"`: see judgedValue.
        const roleValue = judgedValue(node, findAttribute(node, 'role'));
        if (roleValue === null) return;

        const roles = roleValue.trim().split(/\s+/).filter(Boolean);

        // A native checkbox exposes aria-checked from its own `checked`
        // state (ARIA in HTML), whatever checkable role it carries.
        const nativeCheckbox =
          intrinsicName(node) === 'input' &&
          staticAttributeValue(findAttribute(node, 'type'))?.toLowerCase() ===
            'checkbox';

        for (const role of roles) {
          const requiredProps = ARIA_REQUIRED_PROPS[role];
          if (requiredProps) {
            for (const prop of requiredProps) {
              if (nativeCheckbox && prop === 'aria-checked') continue;
              const hasProp = node.attributes.some(
                (
                  attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute,
                ): attr is TSESTree.JSXAttribute =>
                  attr.type === 'JSXAttribute' &&
                  attr.name.type === 'JSXIdentifier' &&
                  attr.name.name === prop,
              );

              if (!hasProp) {
                context.report({
                  node,
                  messageId: 'missingRequiredProp',
                  data: {
                    role,
                    prop,
                  },
                });
              }
            }
          }
        }
      },
    };
  },
});
