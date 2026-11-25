/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: scope
 * Enforce that scope prop is only used on th elements
 *
 * @see https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/scope.md
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
import { createRule } from '@interlace/eslint-devkit';
import { resolveElementType } from '../utils/element-type';

type MessageIds = 'invalidScope';

type RuleOptions = [];

export const scope = createRule<RuleOptions, MessageIds>({
  name: 'scope',
  meta: {
    interop: {
      runtimes: ['eslint', 'oxlint'],
      nativeEquivalent: 'jsx_a11y/scope',
    },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-a11y/docs/rules/scope.md',
      description: 'Enforce that scope prop is only used on th elements',
      wcag: 'WCAG 1.3.1',
    },
    messages: {
      invalidScope: formatLLMMessage({
        icon: MessageIcons.ACCESSIBILITY,
        issueName: 'Invalid Scope Attribute',
        description: 'The scope attribute should only be used on <th> elements',
        severity: 'MEDIUM',
        fix: 'Remove the scope attribute',
        documentationLink:
          'https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/main/docs/rules/scope.md',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'scope') {
          return;
        }

        const parent = node.parent;
        if (!parent || parent.type !== 'JSXOpeningElement') return;

        // Upstream (scope.js:40-44) checks DOM elements only: a component
        // decides itself where `scope` lands, and the rule cannot see through
        // `<TableCell component="th">`. Only the jsx-a11y settings map a
        // component to an element. A DOM element is a lowercase tag without a
        // hyphen (a hyphen makes it a custom element).
        const type = resolveElementType(
          parent,
          context.sourceCode.getText(parent.name),
          context.settings,
        );
        if (!/^[a-z][^-:.]*$/.test(type) || type === 'th') return;

        context.report({ node, messageId: 'invalidScope' });
      },
    };
  },
});
