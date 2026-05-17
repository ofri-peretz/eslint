/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-arbitrary-token-class
 * Enforces R19: no Tailwind arbitrary-value classes (`rounded-[12px]`,
 * `px-[18px]`) on properties that have a design-token equivalent. Allows
 * arbitrary values that reference CSS variables (`rounded-[var(--token)]`),
 * computed expressions (`w-[calc(...)]`), or non-pixel units that don't map
 * to the spacing scale (`min-h-[60vh]`).
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'arbitraryClass';
type RuleOptions = [];

const TOKENIZABLE_PROPS = new Set([
  'rounded',
  'rounded-t', 'rounded-r', 'rounded-b', 'rounded-l',
  'rounded-tl', 'rounded-tr', 'rounded-bl', 'rounded-br',
  'px', 'py', 'pt', 'pb', 'pl', 'pr', 'p',
  'mx', 'my', 'mt', 'mb', 'ml', 'mr', 'm',
  'gap', 'gap-x', 'gap-y',
  'space-x', 'space-y',
  // Sizing handled separately — only flag when the arbitrary value is a token-able pixel size
]);

// Captures e.g. `rounded-[12px]`, `px-[18px]`, `gap-[4rem]`, but NOT
// `w-[calc(...)]`, `rounded-[var(--x)]`, `min-h-[60vh]`, `data-[state=open]:...`.
const ARBITRARY_CLASS_PATTERN = /([\w-]+)-\[([^\]]+)\]/g;
const TOKENIZABLE_VALUE = /^\d+(?:\.\d+)?(?:px|rem|em)$/;

export const noArbitraryTokenClass = createRule<RuleOptions, MessageIds>({
  name: 'no-arbitrary-token-class',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-arbitrary-token-class.md',
      description: 'No Tailwind arbitrary values when a token exists for that property (R19)',
    },
    schema: [],
    messages: {
      arbitraryClass: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Arbitrary Tailwind class',
        description: 'Arbitrary value `{{cls}}` — use a token or extend the theme (R19)',
        severity: 'MEDIUM',
        fix: 'Replace with the matching spacing/radius token or wire a `var(--token)` Tailwind class.',
        documentationLink: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-arbitrary-token-class.md',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const scanString = (node: TSESTree.Node, raw: string): void => {
      for (const match of raw.matchAll(ARBITRARY_CLASS_PATTERN)) {
        const [whole, prop, value] = match;
        if (!TOKENIZABLE_PROPS.has(prop)) continue;
        if (!TOKENIZABLE_VALUE.test(value)) continue;
        context.report({
          node,
          messageId: 'arbitraryClass',
          data: { cls: whole },
        });
      }
    };

    return {
      // className="..." string literal
      'JSXAttribute[name.name="className"] > Literal'(node: TSESTree.Literal) {
        if (typeof node.value === 'string') scanString(node, node.value);
      },
      // className={`...`} template literal (static parts only)
      'JSXAttribute[name.name="className"] TemplateElement'(node: TSESTree.TemplateElement) {
        scanString(node, node.value.cooked);
      },
      // cn("...", "...") / clsx(...) string args
      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'Identifier') return;
        const name = node.callee.name;
        if (name !== 'cn' && name !== 'clsx' && name !== 'twMerge' && name !== 'classNames') return;
        for (const arg of node.arguments) {
          if (arg.type === 'Literal' && typeof arg.value === 'string') {
            scanString(arg, arg.value);
          }
        }
      },
    };
  },
});
