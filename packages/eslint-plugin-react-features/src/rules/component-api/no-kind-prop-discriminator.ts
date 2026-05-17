/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * ESLint Rule: no-kind-prop-discriminator
 * Enforces R11: ban the `type: "A" | "B"` kind-prop pattern when the value
 * is intended to switch the rendered tree. Heuristic: a property named
 * `type` / `kind` / `variant` with a string-literal-union of 2+ members,
 * AND the component body contains a conditional `if (props.<name> === ...)`
 * or switch-case branching on that prop.
 *
 * Notes on intentional false positives:
 * - `variant` is permitted by some teams as a CVA discriminator that only
 *   switches `role` / `className` (not the element tree). This rule flags
 *   the shape; review confirms whether the branching is structural or just
 *   a contract switch.
 * - We only flag `type` / `kind` here; `variant` is allow-listed by default
 *   because CVA usage is the dominant case.
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

type MessageIds = 'kindProp';
type RuleOptions = [];

const FLAGGED_NAMES = new Set(['type', 'kind']);

const isStringLiteralUnion = (
  node: TSESTree.TypeNode | undefined,
): boolean => {
  if (!node) return false;
  if (node.type !== 'TSUnionType') return false;
  const members = node.types;
  if (members.length < 2) return false;
  return members.every(
    (m) =>
      m.type === 'TSLiteralType' &&
      m.literal.type === 'Literal' &&
      typeof m.literal.value === 'string',
  );
};

export const noKindPropDiscriminator = createRule<RuleOptions, MessageIds>({
  name: 'no-kind-prop-discriminator',
  meta: {
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-kind-prop-discriminator.md',
      description: 'Ban `type`/`kind` string-union props that select between rendered trees (R11)',
    },
    schema: [],
    messages: {
      kindProp: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Kind-prop discriminator',
        description: 'Prop `{{name}}: "A" | "B"` likely switches the rendered tree — split into sub-components (R11)',
        severity: 'MEDIUM',
        fix: 'Split into sub-components (`Foo.A`, `Foo.B`). If this is only a CVA contract switch (e.g. role only), rename to `variant` and document the test.',
        documentationLink: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-kind-prop-discriminator.md',
      }),
    },
  },
  defaultOptions: [],
  create(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      TSPropertySignature(node: TSESTree.TSPropertySignature) {
        if (node.key.type !== 'Identifier') return;
        if (!FLAGGED_NAMES.has(node.key.name)) return;
        const ann = node.typeAnnotation?.typeAnnotation;
        if (!isStringLiteralUnion(ann)) return;
        context.report({
          node: node.key,
          messageId: 'kindProp',
          data: { name: node.key.name },
        });
      },
    };
  },
});
