/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Strip TypeScript-only expression wrappers before analysing a value.
 *
 * WHY THIS EXISTS
 *
 * Every taint walker in this repo dispatches on `node.type` and falls through to
 * `return null` / `return false` for anything it does not recognise. None of them
 * had an arm for `TSAsExpression`. That single omission silences the rules on the
 * shape TypeScript users are FORCED to write:
 *
 *   app.get('/s', (req, res) => {
 *     new RegExp(req.query.q as string, 'i');   // QUIET — the cast hid the taint
 *     new RegExp(req.query.q, 'i');             // reports
 *   });
 *
 * The cast is not stylistic. In Express's own types `req.query.q` is
 * `string | string[] | ParsedQs | undefined`, so a TS codebase CANNOT pass it
 * where a string is expected without `as string` (or `!`, or `String(...)`).
 * The practical effect is that the affected rules never fire on TypeScript
 * Express code at all — which is most of the audience these plugins are aimed at.
 *
 * Confirmed across no-ssrf, no-timing-unsafe-compare, no-sql-injection,
 * no-template-injection, no-unsafe-deserialization, no-unsafe-regex-construction
 * and no-unchecked-loop-condition. `grep -c 'as string' *.test.ts` returned ZERO
 * for all of them: no test in any of those suites is written in the dialect their
 * users write, which is exactly why the gap survived every review.
 *
 * These wrappers are erased at compile time and change no runtime value, so
 * unwrapping is always sound for provenance: `x as string` reads exactly what
 * `x` reads.
 */
import type { TSESTree } from '@typescript-eslint/utils';
// The VALUE comes from the local shim, never from the peer. `@typescript-eslint/utils`
// is an optional peer of this package, so a value import survives into the
// published output as a runtime `require` that npm has not installed — the
// no-runtime-optional-peer test exists for exactly this, and this file was the
// one place that still did it. `import type` above is fine: types are erased.
import { AST_NODE_TYPES } from '../ast-node-types';

/**
 * Wrappers that are pure type syntax — erased at compile time, no runtime effect.
 *
 * `TSInstantiationExpression` (`fn<string>`) is included for the same reason.
 * Deliberately NOT included: `TSTypeAssertion` (`<string>x`) IS in the list — it
 * is the legacy angle-bracket form of `as` and equally erased — but anything
 * that can change a value at runtime (a call, a template, `satisfies` on a
 * *different* expression) must never be unwrapped here.
 */
const TYPE_ONLY_WRAPPERS = new Set<string>([
  AST_NODE_TYPES.TSAsExpression,
  AST_NODE_TYPES.TSNonNullExpression,
  AST_NODE_TYPES.TSSatisfiesExpression,
  AST_NODE_TYPES.TSTypeAssertion,
  AST_NODE_TYPES.TSInstantiationExpression,
]);

/**
 * Return the innermost expression, stripping every type-only wrapper.
 *
 * Nesting is real in the wild — `(req.query.q as string)!` — so this loops
 * rather than unwrapping once. `undefined` in, `undefined` out, so it can be
 * dropped into an optional-chained walk without a guard.
 */
export function unwrapTypeSyntax<T extends TSESTree.Node | null | undefined>(
  node: T,
): T extends null | undefined ? T : TSESTree.Node {
  let current = node as TSESTree.Node | null | undefined;
  // Bounded: each step strips one wrapper off a finite tree, so it terminates.
  while (current && TYPE_ONLY_WRAPPERS.has(current.type)) {
    const inner = (current as unknown as { expression?: TSESTree.Node }).expression;
    if (!inner) break;
    current = inner;
  }
  return current as never;
}

/** Is this node a type-only wrapper that `unwrapTypeSyntax` would strip? */
export function isTypeSyntaxWrapper(node: TSESTree.Node | null | undefined): boolean {
  return node !== null && node !== undefined && TYPE_ONLY_WRAPPERS.has(node.type);
}
