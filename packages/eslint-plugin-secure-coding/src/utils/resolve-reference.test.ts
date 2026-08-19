/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The index has to answer exactly what the `.find()` it replaced answered.
 *
 * Every case here is driven through the util directly rather than through a
 * rule, because two of the four are states a parser does not produce: a scope
 * listing the same identifier node twice, and an identifier that is in the
 * reference list but resolves to nothing. Both are reachable from a hand-built
 * scope, both change the answer, and neither would be exercised by lint alone.
 */
import { describe, expect, it } from 'vitest';
import type { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { resolvedReference } from './resolve-reference';

type Scope = TSESLint.Scope.Scope;
type Variable = TSESLint.Scope.Variable;

const identifier = (name: string): TSESTree.Node => ({ type: 'Identifier', name }) as TSESTree.Node;
const scopeOf = (references: unknown[]): Scope => ({ references }) as unknown as Scope;

describe('resolvedReference', () => {
  it('returns the variable an identifier resolves to', () => {
    const node = identifier('handlers');
    const variable = { name: 'handlers' } as Variable;
    expect(resolvedReference(scopeOf([{ identifier: node, resolved: variable }]), node)).toBe(variable);
  });

  it('returns null for a node that is not a reference at all', () => {
    // A property name or a declaration id. Several callers depend on this
    // answering "nothing" rather than resolving by name.
    const node = identifier('key');
    expect(resolvedReference(scopeOf([]), node)).toBeNull();
  });

  it('returns null for a reference that resolves to nothing', () => {
    // An unresolved global. `.find()` returned `undefined` here via `?.resolved`
    // and every caller guards with a falsy check, so null is the same answer.
    const node = identifier('globalThing');
    expect(resolvedReference(scopeOf([{ identifier: node, resolved: null }]), node)).toBeNull();
  });

  it('keeps the FIRST match when a scope lists one identifier twice', () => {
    // The behaviour `.find()` had. A parser does not build this, but the index
    // would silently keep the LAST entry without the guard, which is a
    // different answer from the code this replaced.
    const node = identifier('dup');
    const first = { name: 'first' } as Variable;
    const second = { name: 'second' } as Variable;
    const scope = scopeOf([
      { identifier: node, resolved: first },
      { identifier: node, resolved: second },
    ]);
    expect(resolvedReference(scope, node)).toBe(first);
  });

  it('answers the same on a second lookup, from the cache', () => {
    const node = identifier('cached');
    const variable = { name: 'cached' } as Variable;
    const scope = scopeOf([{ identifier: node, resolved: variable }]);
    expect(resolvedReference(scope, node)).toBe(variable);
    expect(resolvedReference(scope, node)).toBe(variable);
  });

  it('does not leak an index between two scopes', () => {
    const node = identifier('shared');
    const mine = { name: 'mine' } as Variable;
    expect(resolvedReference(scopeOf([{ identifier: node, resolved: mine }]), node)).toBe(mine);
    expect(resolvedReference(scopeOf([]), node)).toBeNull();
  });
});
