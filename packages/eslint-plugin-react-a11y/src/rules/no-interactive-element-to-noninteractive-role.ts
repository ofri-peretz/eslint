/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-interactive-element-to-noninteractive-role
 * Enforce that interactive elements don't have non-interactive ARIA roles
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-interactive-element-to-noninteractive-role.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { findAttribute, staticAttributeValue } from '../utils/jsx-static';

type MessageIds = 'interactiveToNoninteractive';

type Options = Record<string, string[]>;

type RuleOptions = [Options?];

const INTERACTIVE_ELEMENTS = new Set([
  'a',
  'button',
  'input',
  'select',
  'textarea',
]);

const NON_INTERACTIVE_ROLES = new Set([
  'article',
  'banner',
  'complementary',
  'heading',
  'img',
  'listitem',
  'main',
  'region',
  'tooltip',
  'presentation',
  'none',
]);

const DEFAULT_EXCEPTIONS: Record<string, string[]> = {
  tr: ['none', 'presentation'],
};

export const noInteractiveElementToNoninteractiveRole = createRule<
  RuleOptions,
  MessageIds
>({
  name: 'no-interactive-element-to-noninteractive-role',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent:
        'jsx_a11y/no-interactive-element-to-noninteractive-role',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/no-interactive-element-to-noninteractive-role.md',
      description:
        "Enforce that interactive elements don't have non-interactive ARIA roles",
      wcag: 'WCAG 4.1.2',
    },
    messages: {
      interactiveToNoninteractive: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Interactive Element with Non-interactive Role',
        description:
          'Interactive element <{{element}}> should not have non-interactive role "{{role}}"',
        severity: 'HIGH',
        fix: 'Use a wrapper element with the role, or remove the role',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/no-interactive-element-to-noninteractive-role.md',
        wcag: 'WCAG 4.1.2',
      }),
    },
    schema: [
      {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    ],
  },
  defaultOptions: [DEFAULT_EXCEPTIONS],
  createOnce(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    currentOptions,
  ) {
    let exceptions: Record<string, string[]>;

    return {
      before() {
        const [options = {} as Options] = currentOptions();
        exceptions = {
          ...DEFAULT_EXCEPTIONS,
          ...options,
        };
      },
      JSXOpeningElement(node: TSESTree.JSXOpeningElement) {
        if (node.name.type !== 'JSXIdentifier') return;

        const element = node.name.name;

        // Check if element is interactive
        if (!INTERACTIVE_ELEMENTS.has(element)) return;
        // An anchor is interactive only as a link, i.e. with `href`.
        if (element === 'a' && !findAttribute(node, 'href')) return;

        // Find role attribute
        const roleAttr = node.attributes.find(
          (
            attr: TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute,
          ): attr is TSESTree.JSXAttribute =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'JSXIdentifier' &&
            attr.name.name === 'role',
        );

        if (!roleAttr) return;

        // Every static spelling of the role; a dynamic one is unknown.
        const role = staticAttributeValue(roleAttr);
        if (role === null) return;

        // Check if role is non-interactive
        if (!NON_INTERACTIVE_ROLES.has(role)) return;

        // Check if this is an allowed exception
        const allowedRoles = exceptions[element] || [];
        if (allowedRoles.includes(role)) return;

        context.report({
          node: roleAttr,
          messageId: 'interactiveToNoninteractive',
          data: {
            element,
            role,
          },
        });
      },
    };
  },
});
