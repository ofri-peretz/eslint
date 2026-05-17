/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-wrapper-sub-component
 * Enforces R12: don't create wrapper sub-components when an existing
 * primitive does the job. Heuristic: a function component whose entire body
 * is `return <Primitive {...props} />;` — a pure passthrough wrapper that
 * adds no structural behavior.
 *
 * Exempt cases:
 * - The wrapper adds at least one literal attribute (className, data-slot,
 *   aria-*, role) — that's structural behavior.
 * - The wrapper adds hook calls or computed values before returning.
 * - The wrapper renames the component for re-export with no other change —
 *   still flagged; consumers should import the primitive directly.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'wrapperSubComponent';
type RuleOptions = [];

const isPassthroughBody = (
  body: TSESTree.BlockStatement | TSESTree.Expression,
): TSESTree.JSXElement | null => {
  // Arrow function with concise body: () => <X {...props} />
  if (body.type === 'JSXElement') return body;
  // Block body with a single return statement
  if (body.type !== 'BlockStatement') return null;
  if (body.body.length !== 1) return null;
  const stmt = body.body[0];
  if (stmt.type !== 'ReturnStatement') return null;
  if (!stmt.argument || stmt.argument.type !== 'JSXElement') return null;
  return stmt.argument;
};

const isSpreadOnlyJsx = (el: TSESTree.JSXElement): boolean => {
  const attrs = el.openingElement.attributes;
  if (attrs.length !== 1) return false;
  const attr = attrs[0];
  if (attr.type !== 'JSXSpreadAttribute') return false;
  if (attr.argument.type !== 'Identifier') return false;
  // children must be empty (self-closing or empty)
  return el.children.length === 0;
};

const isPascalCaseIdentifier = (s: string): boolean => /^[A-Z]/.test(s);

const isPascalCaseJsxName = (
  name: TSESTree.JSXOpeningElement['name'],
): boolean => {
  if (name.type === 'JSXIdentifier') return isPascalCaseIdentifier(name.name);
  if (name.type === 'JSXMemberExpression') return true;
  return false;
};

export const noWrapperSubComponent = createRule<RuleOptions, MessageIds>({
  name: 'no-wrapper-sub-component',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-wrapper-sub-component.md',
      description: 'Ban pure-passthrough wrapper sub-components — slot the primitive directly (R12)',
    },
    schema: [],
    messages: {
      wrapperSubComponent: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Passthrough wrapper component',
        description: 'Component `{{name}}` is a pure passthrough wrapper — slot the primitive directly (R12)',
        severity: 'MEDIUM',
        fix: 'Delete the wrapper and let consumers import the primitive. If the wrapper must exist, give it structural behavior (a slot, a default prop, or composition logic).',
        documentationLink: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-wrapper-sub-component.md',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const checkFn = (
      node:
        | TSESTree.FunctionDeclaration
        | TSESTree.FunctionExpression
        | TSESTree.ArrowFunctionExpression,
      name: string,
    ): void => {
      if (!isPascalCaseIdentifier(name)) return;
      const jsx = isPassthroughBody(node.body);
      if (!jsx) return;
      if (!isSpreadOnlyJsx(jsx)) return;
      if (!isPascalCaseJsxName(jsx.openingElement.name)) return;
      context.report({
        node,
        messageId: 'wrapperSubComponent',
        data: { name },
      });
    };

    return {
      FunctionDeclaration(node: TSESTree.FunctionDeclaration) {
        if (!node.id) return;
        checkFn(node, node.id.name);
      },
      VariableDeclarator(node: TSESTree.VariableDeclarator) {
        if (node.id.type !== 'Identifier') return;
        if (!node.init) return;
        if (
          node.init.type !== 'ArrowFunctionExpression' &&
          node.init.type !== 'FunctionExpression'
        ) {
          return;
        }
        checkFn(node.init, node.id.name);
      },
    };
  },
});
