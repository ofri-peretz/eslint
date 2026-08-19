/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Resolve an identifier to its variable in O(1) instead of O(references).
 *
 * `scope.references.find((ref) => ref.identifier === node)?.resolved` is the
 * obvious spelling and `detect-object-injection` used it in eight places. It is
 * a linear scan of every reference in the scope, run once per node visited —
 * O(n²) in the size of the enclosing scope.
 *
 * That is not theoretical. Measured 2026-08-19 on the rule's own corpus,
 * repeated to length:
 *
 * ```
 *            one file          many 500-line files
 *   2008L      2.8ms                    2.6ms
 *   8032L      9.5ms                    9.9ms
 *  32128L     76.2ms                   39.3ms
 * ```
 *
 * Split across files the curve is exactly linear (4x lines → 4.0x time). In one
 * file it is 8x for 4x, because every declaration lands in the SAME module
 * scope and each lookup walks all of them. The cost tracks scope size, not code
 * size — and single files that large are real: the 20-repository corpus
 * contains `.yarn/releases/yarn-4.13.0.cjs` at exactly that scale.
 *
 * The index below is built once per scope and keyed on the scope object, so it
 * lives exactly as long as the lint of that file. Semantics are unchanged: the
 * same first-match-wins lookup over the same reference list, including
 * returning nothing when the node is not a reference at all (a property name,
 * a declaration id), which is a case several callers depend on.
 */
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';

type Scope = TSESLint.Scope.Scope;
type Variable = TSESLint.Scope.Variable;

const indexes = new WeakMap<Scope, Map<TSESTree.Node, Variable | null>>();

const indexOf = (scope: Scope): Map<TSESTree.Node, Variable | null> => {
  const existing = indexes.get(scope);
  if (existing) return existing;

  const built = new Map<TSESTree.Node, Variable | null>();
  for (const reference of scope.references) {
    // First match wins, matching the `.find()` this replaces.
    if (!built.has(reference.identifier)) built.set(reference.identifier, reference.resolved ?? null);
  }
  indexes.set(scope, built);
  return built;
};

/** The variable an identifier resolves to in `scope`, or null. */
export const resolvedReference = (scope: Scope, node: TSESTree.Node): Variable | null =>
  indexOf(scope).get(node) ?? null;
