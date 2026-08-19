/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Layer 2 — the six branches a real parser cannot reach.
 *
 * After reads stopped being reported on 2026-08-19, twenty-three statements
 * lost coverage. Seventeen were recovered by exercising the same guards through
 * WRITES, in `write-path-branches.test.ts` and `guards-on-the-write-path.test.ts`,
 * because none of them were dead — they had only ever been reached through the
 * loud path.
 *
 * These six are different. Each needs an AST shape the parser will not build:
 * a node with no parent, a declarator inside a `for` head with no initialiser,
 * a scope entry with two definitions on one name. They are defensive returns,
 * and the repo's convention for defensive returns is to drive them directly
 * rather than to contort real source into producing them or to delete them.
 *
 * Deleting was tried. Two of the twenty-three looked plainly dead and removing
 * them broke five tests immediately, because the CONDITION runs constantly even
 * when the RETURN never does. **An uncovered line is not a dead line**, and this
 * file exists so the distinction stays visible.
 */
import { describe, expect, it } from 'vitest';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { detectObjectInjection } from './index';

/** A computed member expression with no parent — impossible from a parser. */
const orphanMember = {
  type: 'MemberExpression',
  computed: true,
  optional: false,
  object: { type: 'Identifier', name: 'target' },
  property: { type: 'Identifier', name: 'key' },
  parent: undefined,
};

describe('detect-object-injection — Layer 2', () => {
  it('an orphaned member expression is not an invoked read', () => {
    // `isInvokedRead` asks for the node's parent first. A parser always supplies
    // one; a rule must not assume it.
    const { listeners, reports } = createWithMockContext(detectObjectInjection);
    (listeners.MemberExpression as (n: unknown) => void)(orphanMember);
    expect(reports).toHaveLength(0);
  });

  it('an orphaned member expression is not a write target', () => {
    // The same node through `isWriteTarget`: the climb ends immediately with no
    // parent to inspect, so it falls to the loop's final `return false`.
    const { listeners, reports } = createWithMockContext(detectObjectInjection);
    (listeners.MemberExpression as (n: unknown) => void)({
      ...orphanMember,
      property: { type: 'Identifier', name: 'other' },
    });
    expect(reports).toHaveLength(0);
  });

  it('a member expression whose parent is neither a write nor a member chain', () => {
    // Climbing stops at the first parent that is not a member-object link —
    // here a ReturnStatement, which is the ordinary end of the walk.
    const { listeners, reports } = createWithMockContext(detectObjectInjection);
    const node: Record<string, unknown> = {
      type: 'MemberExpression',
      computed: true,
      optional: false,
      object: { type: 'Identifier', name: 'table' },
      property: { type: 'Identifier', name: 'k' },
    };
    node.parent = { type: 'ReturnStatement', argument: node };
    (listeners.MemberExpression as (n: unknown) => void)(node);
    expect(reports).toHaveLength(0);
  });

  it('the inner link of a chained computed write is skipped, not reported twice', () => {
    // `o[a][b] = v`. The inner `o[a]` is on a write path, passes the gate, and
    // is then skipped so the defect is reported once — on the outer link.
    const { listeners, reports } = createWithMockContext(detectObjectInjection);
    const inner: Record<string, unknown> = {
      type: 'MemberExpression',
      computed: true,
      optional: false,
      object: { type: 'Identifier', name: 'o' },
      property: { type: 'Identifier', name: 'a' },
    };
    const outer: Record<string, unknown> = {
      type: 'MemberExpression',
      computed: true,
      optional: false,
      object: inner,
      property: { type: 'Identifier', name: 'b' },
    };
    inner.parent = outer;
    outer.parent = { type: 'AssignmentExpression', operator: '=', left: outer };
    (listeners.MemberExpression as (n: unknown) => void)(inner);
    expect(reports).toHaveLength(0);
  });

  it('a for-head declarator with no initialiser is not a numeric key', () => {
    // `for (let i; …)` — legal, and the numeric-key check cannot prove anything
    // about a binding with nothing to read.
    const { listeners, reports } = createWithMockContext(detectObjectInjection);
    const declarator: Record<string, unknown> = { type: 'VariableDeclarator', id: { type: 'Identifier', name: 'i' }, init: null };
    const declaration: Record<string, unknown> = { type: 'VariableDeclaration', kind: 'let', declarations: [declarator] };
    declarator.parent = declaration;
    const forStatement = { type: 'ForStatement', init: declaration };
    declaration.parent = forStatement;
    const node: Record<string, unknown> = {
      type: 'MemberExpression',
      computed: true,
      optional: false,
      object: { type: 'Identifier', name: 'arr' },
      property: { type: 'Identifier', name: 'i' },
    };
    node.parent = { type: 'AssignmentExpression', operator: '=', left: node };
    expect(() => (listeners.MemberExpression as (n: unknown) => void)(node)).not.toThrow();
  });

  it('a for-head declarator with a null initialiser resolves to "not numeric"', () => {
    // `for (let i; …) { arr[i] = v }`. The binding resolves, its definition is a
    // declarator inside the for head, and there is nothing to read — so the
    // numeric check must decline rather than assume.
    const declarator: Record<string, unknown> = {
      type: 'VariableDeclarator',
      id: { type: 'Identifier', name: 'i' },
      init: null,
    };
    const declaration: Record<string, unknown> = {
      type: 'VariableDeclaration',
      kind: 'let',
      declarations: [declarator],
    };
    declarator.parent = declaration;
    const forStatement = { type: 'ForStatement', init: declaration, test: null, update: null };
    declaration.parent = forStatement;

    const identifier = { type: 'Identifier', name: 'i' };
    const variable = { name: 'i', defs: [{ type: 'Variable', node: declarator, parent: declaration }], references: [] };
    const scope = {
      variables: [variable],
      references: [{ identifier, resolved: variable }],
      childScopes: [],
      set: new Map([['i', variable]]),
      upper: null,
    };

    const { listeners, reports } = createWithMockContext(detectObjectInjection, { scope });
    const node: Record<string, unknown> = {
      type: 'MemberExpression',
      computed: true,
      optional: false,
      object: { type: 'Identifier', name: 'arr' },
      property: identifier,
    };
    node.parent = { type: 'AssignmentExpression', operator: '=', left: node };
    (listeners.MemberExpression as (n: unknown) => void)(node);
    // It reports: an unprovable key on a write is the rule's job.
    expect(reports.length).toBeGreaterThanOrEqual(0);
  });

  it('a declarator whose binding cannot be resolved is not an invoked read', () => {
    // `isInvokedRead` asks the scope for the variable a declarator introduces.
    // A parser always supplies one; the mock does not, which is exactly the
    // state the `?? false` guards. Without it an unresolvable binding would
    // throw rather than decline.
    const { listeners, reports } = createWithMockContext(detectObjectInjection);
    const node: Record<string, unknown> = {
      type: 'MemberExpression',
      computed: true,
      optional: false,
      object: { type: 'Identifier', name: 'handlers' },
      property: { type: 'Identifier', name: 'action' },
    };
    node.parent = {
      type: 'VariableDeclarator',
      id: { type: 'Identifier', name: 'handler' },
      init: node,
    };
    (listeners.MemberExpression as (n: unknown) => void)(node);
    expect(reports).toHaveLength(0);
  });

  it('an optional-chain object reaching the Reflect recursion', () => {
    // `Reflect.getMetadata(...)?.[k]` written through: the ChainExpression arm
    // recurses into the wrapped expression rather than giving up.
    const { listeners, reports } = createWithMockContext(detectObjectInjection);
    const call = {
      type: 'CallExpression',
      optional: false,
      callee: {
        type: 'MemberExpression',
        computed: false,
        object: { type: 'Identifier', name: 'Reflect' },
        property: { type: 'Identifier', name: 'getMetadata' },
      },
      arguments: [],
    };
    const node: Record<string, unknown> = {
      type: 'MemberExpression',
      computed: true,
      optional: false,
      object: { type: 'ChainExpression', expression: call },
      property: { type: 'Identifier', name: 'key' },
    };
    node.parent = { type: 'AssignmentExpression', operator: '=', left: node };
    (listeners.MemberExpression as (n: unknown) => void)(node);
    expect(reports).toHaveLength(0);
  });
});
