/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Dual-layer coverage-gap tests for prevent-double-release.
 *
 * Layer 1: RuleTester fixtures through the real parser for every reachable
 * guard/branch combination (guards on member flags, switch exits, finally
 * interplay, expression-form releases, FN-documenting valid cases).
 *
 * Layer 2: `createWithMockContext` (from @interlace/eslint-devkit) with
 * synthetic AST objects for orderings the parser can never produce
 * (a catch-block release whose source range precedes the try-block release,
 * an if-statement whose alternate range precedes its consequent).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import * as parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { preventDoubleRelease } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
});

describe('prevent-double-release — coverage gaps (Layer 1)', () => {
  ruleTester.run('guard-name variants', preventDoubleRelease, {
    valid: [
      {
        name: 'both releases guarded by member flags: .released then .done',
        code: `
          function f(state) {
            const client = getClient();
            if (!state.released) { client.release(); }
            if (!state.done) { client.release(); }
          }
        `,
      },
      {
        name: 'both releases guarded by member flag .closed',
        code: `
          function f(state) {
            const client = getClient();
            if (!state.closed) { client.release(); }
            if (!state.closed) { client.release(); }
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'computed-member guard is not recognized as a guard',
        code: `
          function f(flags) {
            const client = getClient();
            if (!flags['released']) { client.release(); }
            client.release();
          }
        `,
        errors: [{ messageId: 'doubleRelease' }],
      },
    ],
  });

  ruleTester.run('same-if branch combinations', preventDoubleRelease, {
    valid: [],
    invalid: [
      {
        name: 'both releases inside the same if (no else) — sequential in block',
        code: `
          function f(c) {
            const client = getClient();
            if (c) { client.release(); client.release(); }
          }
        `,
        errors: [{ messageId: 'doubleRelease' }],
      },
      {
        name: 'both releases in consequent while an else exists',
        code: `
          function f(c) {
            const client = getClient();
            if (c) { client.release(); client.release(); } else { other(); }
          }
        `,
        errors: [{ messageId: 'doubleRelease' }],
      },
    ],
  });

  ruleTester.run('switch-case exits', preventDoubleRelease, {
    valid: [
      {
        name: 'each case exits with break — no fallthrough double release',
        code: `
          function f(x) {
            const client = getClient();
            switch (x) {
              case 1: client.release(); break;
              case 2: client.release(); break;
            }
          }
        `,
      },
      {
        name: 'first case exits with throw — no fallthrough',
        code: `
          function f(x) {
            const client = getClient();
            switch (x) {
              case 1: client.release(); throw new Error('stop');
              case 2: client.release(); break;
            }
          }
        `,
      },
      {
        name: 'first case exits with return — no fallthrough',
        code: `
          function f(x) {
            const client = getClient();
            switch (x) {
              case 1: client.release(); return;
              case 2: client.release(); break;
            }
          }
        `,
      },
      {
        name: 'releases in two different switch statements (documented FN)',
        code: `
          function f(a, b) {
            const client = getClient();
            switch (a) { case 1: client.release(); }
            switch (b) { case 1: client.release(); }
          }
        `,
      },
    ],
    invalid: [],
  });

  ruleTester.run('scope and statement-shape guards', preventDoubleRelease, {
    valid: [
      {
        name: 'releases in different arrow functions are not paired',
        code: `
          function f() {
            const client = getClient();
            const g = () => client.release();
            const h = () => client.release();
          }
        `,
      },
      {
        name: 'top-level if with no enclosing block (parentBlock is null)',
        code: `
          const client = getClient();
          if (cond) client.release();
          client.release();
        `,
      },
      {
        name: 'second release sits in a variable declarator, not an expression statement',
        code: `
          function f(cond) {
            const client = getClient();
            if (cond) { client.release(); }
            const r = client.release();
          }
        `,
      },
      {
        name: 'two sequential ifs where the first exits after releasing',
        code: `
          function f(a, b) {
            const client = getClient();
            if (a) { client.release(); return; }
            if (b) { client.release(); }
          }
        `,
      },
      {
        name: 'two ifs in different blocks are not treated as sequential',
        code: `
          function f(a, b) {
            const client = getClient();
            if (a) { client.release(); }
            { if (b) { client.release(); } }
          }
        `,
      },
    ],
    invalid: [],
  });

  ruleTester.run('if-branch exit analysis (ifBranchHasExitAfterRelease)', preventDoubleRelease, {
    valid: [],
    invalid: [
      {
        name: 'release in else-block of finally, then unconditional release',
        code: `
          function f(x) {
            const client = getClient();
            try { bar(); } finally {
              if (x) { nop(); } else { client.release(); }
              client.release();
            }
          }
        `,
        errors: [{ messageId: 'doubleRelease' }],
      },
      {
        name: 'release in blockless else of finally, then unconditional release',
        code: `
          function f(x) {
            const client = getClient();
            try { bar(); } finally {
              if (x) { nop(); } else client.release();
              client.release();
            }
          }
        `,
        errors: [{ messageId: 'doubleRelease' }],
      },
      {
        name: 'release in blockless if consequent, then unconditional release',
        code: `
          function f(x) {
            const client = getClient();
            try { bar(); } finally {
              if (x) client.release();
              client.release();
            }
          }
        `,
        errors: [{ messageId: 'doubleRelease' }],
      },
      {
        name: 'first release assigned in a declarator inside the if branch',
        code: `
          function f(x) {
            const client = getClient();
            if (x) { const r = client.release(); }
            client.release();
          }
        `,
        errors: [{ messageId: 'doubleRelease' }],
      },
      {
        name: 'first release wrapped in a nested block inside the if branch',
        code: `
          function f(x) {
            const client = getClient();
            if (x) { { client.release(); } }
            client.release();
          }
        `,
        errors: [{ messageId: 'doubleRelease' }],
      },
      {
        name: 'non-exit statement after release inside the if branch',
        code: `
          function f(x) {
            const client = getClient();
            if (x) { client.release(); log('done'); }
            client.release();
          }
        `,
        errors: [{ messageId: 'doubleRelease' }],
      },
    ],
  });

  ruleTester.run('try-catch-finally interplay', preventDoubleRelease, {
    valid: [
      {
        name: 'guarded-if release with return inside finally, then tail release',
        code: `
          function f(x) {
            const client = getClient();
            try { foo(); } finally {
              if (x) { client.release(); return; }
              client.release();
            }
          }
        `,
      },
      {
        name: 'release in first try, second release in a different finally',
        code: `
          async function f() {
            const client = getClient();
            try { client.release(); } catch (e) { log(e); }
            try { foo(); } finally { client.release(); }
          }
        `,
      },
      {
        name: 'release in catch, second release still inside the same catch if',
        code: `
          function f(x) {
            const client = getClient();
            try { foo(); } catch (e) {
              client.release();
              if (x) { client.release(); }
            }
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'inner-catch release then release later in the outer try block',
        code: `
          function f() {
            const client = getClient();
            try {
              try { foo(); } catch (e) { client.release(); }
              client.release();
            } catch (e2) { log(e2); }
          }
        `,
        errors: [{ messageId: 'doubleRelease' }],
      },
      {
        name: 'catch release of one try, then release after that try (different finally)',
        code: `
          function f() {
            const client = getClient();
            try { foo(); } catch (e) { client.release(); }
            try { bar(); } finally { client.release(); }
          }
        `,
        errors: [{ messageId: 'doubleRelease' }],
      },
    ],
  });

  ruleTester.run('expression-form releases (Case 13)', preventDoubleRelease, {
    valid: [
      {
        name: 'logical-expression release inside a declarator (walk ends at Program)',
        code: `
          function f(cond) {
            const client = getClient();
            const y = cond && client.release();
            client.release();
          }
        `,
      },
      {
        name: 'ternary release in a nested block, second release in outer block',
        code: `
          function f(cond) {
            const client = getClient();
            { cond ? client.release() : nop(); }
            client.release();
          }
        `,
      },
      {
        name: 'declarator-assigned release then plain release (walk breaks at block)',
        code: `
          function f() {
            const client = getClient();
            const a = client.release();
            client.release();
          }
        `,
      },
    ],
    invalid: [
      {
        name: 'ternary release then sequential release in the same block',
        code: `
          function f(cond) {
            const client = getClient();
            cond ? client.release() : nop();
            client.release();
          }
        `,
        errors: [{ messageId: 'doubleRelease' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Layer 2 — synthetic ASTs for parser-impossible orderings.
// ---------------------------------------------------------------------------

type SyntheticNode = Record<string, unknown>;

/** Build `client.release()` as identifier → member → call, with ancestry. */
function makeReleaseCall(range: [number, number]): {
  identifier: SyntheticNode;
  call: SyntheticNode;
} {
  const identifier: SyntheticNode = { type: 'Identifier', name: 'client', range };
  const member: SyntheticNode = {
    type: 'MemberExpression',
    object: identifier,
    property: { type: 'Identifier', name: 'release' },
    computed: false,
    range,
  };
  const call: SyntheticNode = {
    type: 'CallExpression',
    callee: member,
    arguments: [],
    range,
  };
  identifier.parent = member;
  member.parent = call;
  return { identifier, call };
}

/** Wrap a call in an ExpressionStatement attached to a parent block. */
function attachAsStatement(
  call: SyntheticNode,
  parent: SyntheticNode,
  range: [number, number],
): SyntheticNode {
  const stmt: SyntheticNode = {
    type: 'ExpressionStatement',
    expression: call,
    parent,
    range,
  };
  call.parent = stmt;
  return stmt;
}

function runDeclaratorListener(referenceIdentifiers: SyntheticNode[]) {
  const { listeners, reports, context } = createWithMockContext(
    preventDoubleRelease,
  );
  const variable = {
    defs: [
      {
        type: 'Variable',
        node: { id: { type: 'Identifier' } },
        name: { name: 'client' },
      },
    ],
    references: referenceIdentifiers.map((identifier) => ({ identifier })),
  };
  (
    context.sourceCode as unknown as {
      getDeclaredVariables: () => unknown[];
    }
  ).getDeclaredVariables = () => [variable];
  const visit = listeners['VariableDeclarator'] as (n: unknown) => void;
  visit({ type: 'VariableDeclarator' });
  return reports;
}

describe('prevent-double-release — coverage gaps (Layer 2, synthetic AST)', () => {
  it('reports Case 2 (catch release ordered before try release — impossible ranges)', () => {
    // TryStatement whose catch-clause release has a SMALLER source range than
    // the try-block release. Real parses always order try-block < catch, so
    // this branch is reachable only with a fabricated AST.
    const tryStmt: SyntheticNode = { type: 'TryStatement', range: [0, 100] };
    const tryBlock: SyntheticNode = {
      type: 'BlockStatement',
      range: [10, 50],
      parent: tryStmt,
      body: [],
    };
    const catchBody: SyntheticNode = { type: 'BlockStatement', range: [52, 93] };
    const catchClause: SyntheticNode = {
      type: 'CatchClause',
      range: [50, 95],
      parent: tryStmt,
      body: catchBody,
    };
    catchBody.parent = catchClause;
    tryStmt.block = tryBlock;
    tryStmt.handler = catchClause;
    tryStmt.finalizer = null;

    const a = makeReleaseCall([12, 18]); // "in" catch by ancestry, earlier range
    attachAsStatement(a.call, catchBody, [12, 19]);
    const b = makeReleaseCall([20, 30]); // in try block, later range
    attachAsStatement(b.call, tryBlock, [20, 31]);

    const reports = runDeclaratorListener([a.identifier, b.identifier]);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ messageId: 'doubleRelease' });
    expect((reports[0] as { node: unknown }).node).toBe(b.call);
  });

  it('skips mutually exclusive branches when alternate range precedes consequent', () => {
    // Same if/else for both releases, but the alternate's range sits BEFORE
    // the consequent's — the sorted first call lands in the alternate. This
    // exercises the (aInAlternate && bInConsequent) disjunct, unreachable
    // with real source ranges.
    const ifStmt: SyntheticNode = {
      type: 'IfStatement',
      test: { type: 'Identifier', name: 'c' },
      range: [0, 100],
    };
    const consequent: SyntheticNode = {
      type: 'BlockStatement',
      range: [40, 60],
      parent: ifStmt,
      body: [],
    };
    const alternate: SyntheticNode = {
      type: 'BlockStatement',
      range: [10, 30],
      parent: ifStmt,
      body: [],
    };
    ifStmt.consequent = consequent;
    ifStmt.alternate = alternate;

    const a = makeReleaseCall([12, 15]); // inside alternate (earlier range)
    attachAsStatement(a.call, alternate, [12, 16]);
    const b = makeReleaseCall([42, 45]); // inside consequent (later range)
    attachAsStatement(b.call, consequent, [42, 46]);

    const reports = runDeclaratorListener([a.identifier, b.identifier]);
    expect(reports).toHaveLength(0);
  });
});
