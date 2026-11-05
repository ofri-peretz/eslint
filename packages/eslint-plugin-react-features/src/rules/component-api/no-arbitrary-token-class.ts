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
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';
import type { StringPiece } from '../../utils/class-strings';
import {
  classStrings,
  isClassNameBuilder,
  valueStrings,
} from '../../utils/class-strings';

type MessageIds = 'arbitraryClass';
type RuleOptions = [];

const TOKENIZABLE_PROPS = new Set([
  'rounded',
  'rounded-t',
  'rounded-r',
  'rounded-b',
  'rounded-l',
  'rounded-tl',
  'rounded-tr',
  'rounded-bl',
  'rounded-br',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'p',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'm',
  'gap',
  'gap-x',
  'gap-y',
  'space-x',
  'space-y',
  // Sizing handled separately — only flag when the arbitrary value is a token-able pixel size
]);

// Captures e.g. `rounded-[12px]`, `px-[18px]`, `gap-[4rem]`, but NOT
// `w-[calc(...)]`, `rounded-[var(--x)]`, `min-h-[60vh]`, `data-[state=open]:...`.
const ARBITRARY_CLASS_PATTERN = /([\w-]+)-\[([^\]]+)\]/g;
/** A plain length: `18px`, `1.5rem`, `.5rem`, `2em`. */
const TOKENIZABLE_VALUE = /^(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)$/;

export const noArbitraryTokenClass = createRule<RuleOptions, MessageIds>({
  name: 'no-arbitrary-token-class',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-arbitrary-token-class.md',
      description:
        'No Tailwind arbitrary values when a token exists for that property (R19)',
    },
    schema: [],
    messages: {
      arbitraryClass: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Arbitrary Tailwind class',
        description:
          'Arbitrary value `{{cls}}` — use a token or extend the theme (R19)',
        severity: 'MEDIUM',
        fix: 'Replace with the matching spacing/radius token or wire a `var(--token)` Tailwind class.',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-arbitrary-token-class.md',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    const scanString = (node: TSESTree.Node, raw: string): void => {
      for (const match of raw.matchAll(ARBITRARY_CLASS_PATTERN)) {
        const [whole, prop, value] = match;
        // `-mx-[4px]` is the negative of `mx`: the same spacing scale.
        const utility = prop.startsWith('-') ? prop.slice(1) : prop;
        if (!TOKENIZABLE_PROPS.has(utility)) continue;
        if (!TOKENIZABLE_VALUE.test(value)) continue;
        context.report({
          node,
          messageId: 'arbitraryClass',
          data: { cls: whole },
        });
      }
    };
    const scan = (pieces: StringPiece[]): void => {
      for (const piece of pieces) scanString(piece.node, piece.text);
    };

    return {
      // `className="…"`, `{"…"}`, a template, a conditional, `flag && "…"`.
      'JSXAttribute[name.name="className"]'(node: TSESTree.JSXAttribute) {
        if (!node.value) return;
        scan(
          node.value.type === 'JSXExpressionContainer'
            ? valueStrings(node.value.expression)
            : valueStrings(node.value),
        );
      },
      // cn() / clsx() / classnames / twMerge, by name or import binding:
      // plain, conditional and template arguments, array elements, object keys.
      CallExpression(node: TSESTree.CallExpression) {
        if (!isClassNameBuilder(node.callee, context.sourceCode.getScope(node)))
          return;
        for (const arg of node.arguments) scan(classStrings(arg));
      },
    };
  },
});
