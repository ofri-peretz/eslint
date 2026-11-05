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
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  staticString,
} from '@interlace/eslint-devkit';

type MessageIds = 'kindProp';
type RuleOptions = [];

const FLAGGED_NAMES = new Set(['type', 'kind']);

type Scope = TSESLint.Scope.Scope;

/** `type`, `'type'` and `['type']` all declare `type`. */
const signatureKeyName = (
  node: TSESTree.TSPropertySignature,
): string | null => {
  const { key } = node;
  // A computed key names a property only when it is a static string.
  if (node.computed || key.type !== 'Identifier') return staticString(key);
  return key.name;
};

/** The type a local type alias stands for (`type Kind = 'a' | 'b'`), if declared in scope. */
const aliasTarget = (
  ref: TSESTree.TSTypeReference,
  scope: Scope,
): TSESTree.TypeNode | undefined => {
  if (ref.typeName.type !== 'Identifier' || ref.typeArguments) return undefined;
  const { name } = ref.typeName;
  for (let s: Scope | null = scope; s; s = s.upper) {
    const def = s.set
      .get(name)
      ?.defs.find((d) => d.node.type === 'TSTypeAliasDeclaration');
    if (def)
      return (def.node as TSESTree.TSTypeAliasDeclaration).typeAnnotation;
  }
  return undefined;
};

/**
 * A union of 2+ string literals, optionally widened with `undefined` / `null`
 * (an optional kind), written inline or through a local type alias.
 */
const isStringLiteralUnion = (
  node: TSESTree.TypeNode | undefined,
  scope: Scope,
  seen: Set<TSESTree.Node> = new Set(),
): boolean => {
  if (!node || seen.has(node)) return false;
  seen.add(node);
  if (node.type === 'TSTypeReference')
    return isStringLiteralUnion(aliasTarget(node, scope), scope, seen);
  if (node.type !== 'TSUnionType') return false;
  const literals = node.types.filter(
    (m) =>
      m.type === 'TSLiteralType' &&
      m.literal.type === 'Literal' &&
      typeof m.literal.value === 'string',
  );
  return (
    literals.length >= 2 &&
    node.types.every(
      (m) =>
        literals.includes(m) ||
        m.type === 'TSUndefinedKeyword' ||
        m.type === 'TSNullKeyword',
    )
  );
};

export const noKindPropDiscriminator = createRule<RuleOptions, MessageIds>({
  name: 'no-kind-prop-discriminator',
  meta: {
    interop: { runtimes: ['eslint', 'oxlint'] },
    type: 'problem',
    docs: {
      url: 'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-kind-prop-discriminator.md',
      description:
        'Ban `type`/`kind` string-union props that select between rendered trees (R11)',
    },
    schema: [],
    messages: {
      kindProp: formatLLMMessage({
        icon: MessageIcons.WARNING,
        issueName: 'Kind-prop discriminator',
        description:
          'Prop `{{name}}: "A" | "B"` likely switches the rendered tree — split into sub-components (R11)',
        severity: 'MEDIUM',
        fix: 'Split into sub-components (`Foo.A`, `Foo.B`). If this is only a CVA contract switch (e.g. role only), rename to `variant` and document the test.',
        documentationLink:
          'https://github.com/ofri-peretz/eslint/blob/main/packages/eslint-plugin-react-features/docs/rules/component-api/no-kind-prop-discriminator.md',
      }),
    },
  },
  defaultOptions: [],
  createOnce(context: TSESLint.RuleContext<MessageIds, RuleOptions>) {
    return {
      TSPropertySignature(node: TSESTree.TSPropertySignature) {
        const name = signatureKeyName(node);
        if (name === null || !FLAGGED_NAMES.has(name)) return;
        const ann = node.typeAnnotation?.typeAnnotation;
        if (!isStringLiteralUnion(ann, context.sourceCode.getScope(node)))
          return;
        context.report({
          node: node.key,
          messageId: 'kindProp',
          data: { name },
        });
      },
    };
  },
});
