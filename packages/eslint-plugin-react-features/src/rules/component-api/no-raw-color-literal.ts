/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-raw-color-literal
 * Enforces R19: no raw color literals (hex, rgb/rgba, hsl/hsla, oklch/oklab)
 * in source. Colors must come from design tokens via CSS custom properties
 * or Tailwind classes wired to them. Scoped to JSX `style` / `className`
 * object values and `cn()`/`clsx()` arguments to minimize false positives.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'rawColor';
type RuleOptions = [];

const COLOR_PATTERN =
  /(#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab)\s*\()/;

const isColorString = (s: string): boolean => COLOR_PATTERN.test(s);

const reportIfColorLiteral = (
  context: TSESLint.RuleContext<MessageIds, RuleOptions>,
  node: TSESTree.Node,
  value: unknown,
): void => {
  if (typeof value === 'string' && isColorString(value)) {
    context.report({ node, messageId: 'rawColor' });
  }
};

export const noRawColorLiteral = createRule<RuleOptions, MessageIds>({
  name: 'no-raw-color-literal',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-raw-color-literal.md',
      description: 'No raw hex / rgb / hsl / oklch color literals in source — use design tokens (R19)',
    },
    schema: [],
    messages: {
      rawColor: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Raw color literal',
        description: 'Raw color literal in source — use a design token (R19)',
        severity: 'MEDIUM',
        fix: 'Replace with a CSS custom property (`var(--your-token)`) or a Tailwind theme class wired to it.',
        documentationLink: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-raw-color-literal.md',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      // Color inside JSX attribute string values (className="text-[#fff]", style="...")
      'JSXAttribute > Literal'(node: TSESTree.Literal) {
        reportIfColorLiteral(context, node, node.value);
      },
      // Color inside `style={{ color: "#fff" }}` and similar
      'JSXExpressionContainer ObjectExpression > Property > Literal'(
        node: TSESTree.Literal,
      ) {
        reportIfColorLiteral(context, node, node.value);
      },
      // Color inside cn()/clsx()/twMerge() args: cn("text-[#fff]")
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'Identifier') return;
        const name = node.callee.name;
        if (name !== 'cn' && name !== 'clsx' && name !== 'twMerge' && name !== 'classNames') return;
        for (const arg of node.arguments) {
          if (arg.type === 'Literal') {
            reportIfColorLiteral(context, arg, arg.value);
          }
        }
      },
    };
  },
});
