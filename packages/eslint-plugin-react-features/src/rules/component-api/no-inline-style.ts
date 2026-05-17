/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-inline-style
 * Enforces R18: no inline `style={{...}}` for static styling. The only
 * permitted case is CSS-variable assignment (`style={{ "--snp-x": x }}`)
 * for genuinely dynamic values. Everything else belongs in Tailwind classes.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'inlineStyle';
type RuleOptions = [];

const isCssVariableKey = (prop: TSESTree.Property | TSESTree.SpreadElement): boolean => {
  if (prop.type !== 'Property') return false;
  if (prop.key.type === 'Literal' && typeof prop.key.value === 'string') {
    return prop.key.value.startsWith('--');
  }
  return false;
};

const isStaticLiteralValue = (prop: TSESTree.Property | TSESTree.SpreadElement): boolean => {
  if (prop.type !== 'Property') return false;
  const v = prop.value;
  return v.type === 'Literal' && (typeof v.value === 'string' || typeof v.value === 'number');
};

export const noInlineStyle = createRule<RuleOptions, MessageIds>({
  name: 'no-inline-style',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-inline-style.md',
      description: 'No inline `style={{}}` except for CSS-variable assignment (R18)',
    },
    schema: [],
    messages: {
      inlineStyle: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Inline style prop',
        description: 'Inline `style={{}}` with static value(s) — use Tailwind classes (R18)',
        severity: 'MEDIUM',
        fix: 'Move the static value to a Tailwind class. Reserve inline style for CSS variables and computed dynamic values.',
        documentationLink: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-inline-style.md',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      JSXAttribute(node: TSESTree.JSXAttribute) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') return;
        if (!node.value || node.value.type !== 'JSXExpressionContainer') return;
        const expr = node.value.expression;
        if (expr.type !== 'ObjectExpression') return;
        // Report only when at least one property is a static literal AND not a CSS variable assignment.
        const hasStaticNonVarProp = expr.properties.some(
          (p) => !isCssVariableKey(p) && isStaticLiteralValue(p),
        );
        if (hasStaticNonVarProp) {
          context.report({ node, messageId: 'inlineStyle' });
        }
      },
    };
  },
});
