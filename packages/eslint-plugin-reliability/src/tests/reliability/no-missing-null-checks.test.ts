/**
 * Comprehensive tests for no-missing-null-checks rule
 * Quality: CWE-476 - Detects potential null pointer dereferences
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { createWithMockContext } from '@interlace/eslint-devkit';
import {
  noMissingNullChecks,
  hasNullCheck,
} from '../../rules/reliability/no-missing-null-checks';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-missing-null-checks', () => {
  describe('Valid Code - Optional Chaining', () => {
    ruleTester.run('valid - optional chaining', noMissingNullChecks, {
      valid: [
        // Direct optional chaining
        {
          code: 'obj?.property;',
        },
        {
          code: 'obj?.property?.method();',
        },
        {
          code: 'value?.nested?.deep;',
        },
        // Optional chaining with method calls
        {
          code: 'obj?.method();',
        },
        // ChainExpression parent
        {
          code: 'const result = obj?.nested?.value;',
        },
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Nullish Coalescing', () => {
    ruleTester.run('valid - nullish coalescing', noMissingNullChecks, {
      valid: [
        {
          code: 'const result = value ?? defaultValue;',
        },
        {
          code: 'const x = obj.prop ?? fallback;',
        },
        {
          code: 'const nested = obj.a.b ?? "default";',
        },
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Explicit Null Checks', () => {
    ruleTester.run('valid - explicit null checks', noMissingNullChecks, {
      valid: [
        // obj !== null pattern
        {
          code: 'if (obj !== null) { obj.property; }',
        },
        // obj != null pattern
        {
          code: 'if (obj != null) { obj.property; }',
        },
        // obj !== undefined pattern
        {
          code: 'if (obj !== undefined) { obj.property; }',
        },
        // null !== obj pattern (reversed)
        {
          code: 'if (null !== obj) { obj.property; }',
        },
        // undefined !== obj pattern (reversed)
        {
          code: 'if (undefined !== obj) { obj.property; }',
        },
        // Logical expression with null checks
        {
          code: 'if (obj !== null && obj !== undefined) { obj.property; }',
        },
        // Logical expression checking right side
        {
          code: 'if (someCondition && obj !== null) { obj.property; }',
        },
        // Note: Early return patterns like `if (obj === null) { return; } obj.property;`
        // are NOT detected by this rule - would require control flow analysis
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Truthy Guard (FP regression)', () => {
    ruleTester.run('valid - truthy if guard', noMissingNullChecks, {
      valid: [
        // if (obj) { obj.prop } — direct truthy check proves non-null
        {
          code: 'if (obj) { obj.property; }',
          filename: 'src/utils.ts',
        },
        {
          code: 'if (user) { user.name; }',
          filename: 'src/utils.ts',
        },
        {
          code: 'if (response) { response.data.items; }',
          filename: 'src/utils.ts',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - short-circuit AND guard', noMissingNullChecks, {
      valid: [
        // obj && obj.prop — left-side guard proves right side is safe
        {
          code: 'const x = obj && obj.property;',
          filename: 'src/utils.ts',
        },
        {
          code: 'const r = user && user.name;',
          filename: 'src/utils.ts',
        },
        {
          code: 'const v = config && config.enabled;',
          filename: 'src/utils.ts',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - ternary guard', noMissingNullChecks, {
      valid: [
        // obj ? obj.prop : fallback — truthy test guards consequent
        {
          code: 'const x = obj ? obj.property : null;',
          filename: 'src/utils.ts',
        },
        {
          code: 'const name = user ? user.name : "anonymous";',
          filename: 'src/utils.ts',
        },
      ],
      invalid: [],
    });
  });

  describe('Valid Code - Test Files', () => {
    ruleTester.run('valid - test files ignored', noMissingNullChecks, {
      valid: [
        {
          code: 'obj.property;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
        {
          code: 'obj.method();',
          filename: 'component.test.tsx',
          options: [{ ignoreInTests: true }],
        },
        {
          code: 'value.nested.deep;',
          filename: 'utils.spec.js',
          options: [{ ignoreInTests: true }],
        },
        {
          code: 'data.items.length;',
          filename: 'api.test.jsx',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Property Access', () => {
    ruleTester.run('invalid - unsafe property access', noMissingNullChecks, {
      valid: [],
      invalid: [
        // Simple property access
        {
          code: 'const x = obj.property;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Method call without null check
        {
          code: 'obj.method();',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Nested property access
        {
          code: 'const x = value.nested.deep;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Property access in expression
        {
          code: 'const result = data.items.length;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  describe('Invalid Code - Method Calls', () => {
    ruleTester.run('invalid - unsafe method calls', noMissingNullChecks, {
      valid: [],
      invalid: [
        // Simple method call
        {
          code: 'service.fetchData();',
          filename: 'src/api.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Method call with arguments
        {
          code: 'handler.process(data);',
          filename: 'src/processor.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Chained method call without optional chaining
        {
          code: 'response.data.map(x => x);',
          filename: 'src/transform.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  describe('Invalid Code - Nested Member Expressions', () => {
    ruleTester.run('invalid - nested member expressions', noMissingNullChecks, {
      valid: [],
      invalid: [
        // Deep nesting
        {
          code: 'const value = api.response.data.items;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Method on nested property
        {
          code: 'config.settings.getValue();',
          filename: 'src/config.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  describe('Options - ignoreInTests', () => {
    ruleTester.run('options - ignoreInTests false', noMissingNullChecks, {
      valid: [],
      invalid: [
        // Test file with ignoreInTests = false
        {
          code: 'obj.property;',
          filename: 'component.test.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Spec file with ignoreInTests = false
        {
          code: 'service.method();',
          filename: 'api.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  describe('Edge Cases', () => {
    ruleTester.run('edge cases', noMissingNullChecks, {
      valid: [
        // Literals don't need null checks
        {
          code: '"string".length;',
        },
        // Already using optional chaining
        {
          code: 'arr?.[0]?.name;',
        },
        // Simple null check with single property access
        {
          code: 'if (obj !== null) { obj.property; }',
        },
        // Optional method call with ChainExpression
        {
          code: 'obj?.method?.();',
        },
        // Method call with optional chaining
        {
          code: 'service?.fetchData();',
        },
      ],
      invalid: [
        // Property access on identifier
        {
          code: 'myVar.field;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  describe('Provably Non-Nullable Identifiers', () => {
    ruleTester.run('valid - never-null globals', noMissingNullChecks, {
      valid: [
        // NEVER_NULL_GLOBALS identifier as object (MemberExpression path)
        { code: 'const pi = Math.PI;', filename: 'src/utils.ts' },
        // NEVER_NULL_GLOBALS identifier as object (CallExpression path)
        { code: 'console.log("hello");', filename: 'src/utils.ts' },
        // Nested member chain rooted at a never-null global (MemberExpression path)
        { code: 'const env = process.env.NODE_ENV;', filename: 'src/utils.ts' },
        // Nested member chain rooted at a never-null global (CallExpression path)
        { code: 'process.stdout.write("x");', filename: 'src/utils.ts' },
      ],
      invalid: [],
    });

    ruleTester.run('valid - definition-based proofs', noMissingNullChecks, {
      valid: [
        // catch-clause parameter is never null
        { code: 'try { run(); } catch (e) { e.message; }', filename: 'src/utils.ts' },
        // import binding is never null
        { code: 'import lib from "lib"; lib.init();', filename: 'src/utils.ts' },
        // const x = new Foo() — constructor result is never null
        { code: 'const svc = new Service(); svc.start();', filename: 'src/utils.ts' },
        // array literal initializer
        { code: 'const arr = [1, 2]; arr.push(3);', filename: 'src/utils.ts' },
        // object literal initializer
        { code: 'const cfg = { a: 1 }; cfg.a;', filename: 'src/utils.ts' },
        // template literal initializer
        { code: 'const s = `text`; s.length;', filename: 'src/utils.ts' },
        // class expression initializer
        { code: 'const C = class {}; C.name;', filename: 'src/utils.ts' },
        // primitive literal initializer
        { code: 'const n = 5; n.toFixed(2);', filename: 'src/utils.ts' },
        // await fetch(...) — WHATWG fetch resolves to a Response
        {
          code: 'async function f() { const res = await fetch(url); res.json(); }',
          filename: 'src/utils.ts',
        },
        // Object/Array/JSON static call initializers
        { code: 'const keys = Object.keys(o); keys.length;', filename: 'src/utils.ts' },
        { code: 'const list = Array.from(xs); list.length;', filename: 'src/utils.ts' },
        { code: 'const data = JSON.parse(raw); data.id;', filename: 'src/utils.ts' },
        // function declaration name is never null
        { code: 'function g() {} g.call(null);', filename: 'src/utils.ts' },
        // class declaration name is never null
        { code: 'class D {} D.build();', filename: 'src/utils.ts' },
        // function parameters are treated as non-nullable (caller contract)
        { code: 'function h(p) { p.x; }', filename: 'src/utils.ts' },
        // outer-scope variable resolved through the scope chain (provable init)
        {
          code: 'function outer() { const box = new Box(); function inner() { box.open(); } }',
          filename: 'src/utils.ts',
        },
      ],
      invalid: [],
    });

    ruleTester.run('invalid - initializers that prove nothing', noMissingNullChecks, {
      valid: [],
      invalid: [
        // let x; — no initializer, nothing proven
        {
          code: 'let maybe; maybe.field;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // const x = null; — the null literal itself is NOT a proof
        {
          code: 'const nothing = null; nothing.field;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // await of a non-fetch call
        {
          code: 'async function f() { const r = await getData(); r.field; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // await of a non-call expression
        {
          code: 'async function f() { const r = await pending; r.field; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // await of a method call (callee is not a plain identifier)
        {
          code: 'async function f() { const r = await client.get(url); r.field; }',
          filename: 'src/utils.ts',
          errors: [
            { messageId: 'missingNullCheck' },
            { messageId: 'missingNullCheck' },
          ],
        },
        // call initializer with a plain identifier callee
        {
          code: 'const v = compute(); v.field;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // static call on a namespace that is NOT Object/Array/JSON
        {
          code: 'const p = Promise.resolve(1); p.field;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // outer-scope variable with a non-provable initializer
        {
          code: 'function outer() { const conn = connect(); function inner() { conn.close(); } }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  describe('Guard Analysis Edge Cases', () => {
    ruleTester.run('short-circuit AND variants', noMissingNullChecks, {
      valid: [
        // AND guard protecting a method call (CallExpression wrapper path)
        {
          code: 'const y = obj && obj.method();',
          filename: 'src/utils.ts',
        },
      ],
      invalid: [
        // leftText.endsWith(objectText): `wrapper.obj && obj.prop` — the
        // guarded right side is safe; only the ungated left deref reports
        {
          code: 'const x = wrapper.obj && obj.prop;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Unrelated left side does not guard
        {
          code: 'const x = flag && obj.prop;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });

    ruleTester.run('ternary guard variants', noMissingNullChecks, {
      valid: [],
      invalid: [
        // Ternary test unrelated to the dereferenced object
        {
          code: 'const x = cond ? obj.prop : fallback;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });

    ruleTester.run('if-statement guard variants', noMissingNullChecks, {
      valid: [
        // Equality-to-null test text matches — current behavior treats any
        // ===/==/!==/!= comparison against null/undefined as "has a check"
        { code: 'if (obj === null) { obj.prop; }', filename: 'src/utils.ts' },
        { code: 'if (obj == undefined) { obj.prop; }', filename: 'src/utils.ts' },
      ],
      invalid: [
        // Unrelated truthy test does not guard obj
        {
          code: 'if (ready) { obj.prop; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Binary comparison that is not a null check
        {
          code: 'if (count > 5) { obj.prop; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Null comparison against a DIFFERENT object
        {
          code: 'if (other !== null) { obj.prop; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  describe('Optional-chain tail and non-identifier bases', () => {
    ruleTester.run('chain expression parents', noMissingNullChecks, {
      valid: [
        // `obj?.a.b` — outer member is non-optional but sits inside a
        // ChainExpression, so it is already protected
        { code: 'obj?.a.b;', filename: 'src/utils.ts' },
        // Call on the result of a call — object is neither Identifier nor
        // MemberExpression, rule does not analyze it
        { code: 'getService().init();', filename: 'src/utils.ts' },
        // Plain call with identifier callee — CallExpression listener skips
        { code: 'standalone();', filename: 'src/utils.ts' },
        // this-rooted chains are never flagged (MemberExpression path)
        { code: 'class A { m() { return this.config.value; } }', filename: 'src/utils.ts' },
        // this-rooted chains are never flagged (CallExpression path)
        { code: 'class B { m() { this.api.fetch(); } }', filename: 'src/utils.ts' },
      ],
      invalid: [],
    });
  });

  describe('CallExpression Coverage', () => {
    ruleTester.run('call expression edge cases', noMissingNullChecks, {
      valid: [
        // Method call with optional chaining on callee
        {
          code: 'obj?.method();',
        },
        // Nested optional method call
        {
          code: 'response?.data?.map(x => x);',
        },
      ],
      invalid: [
        // Method call on nested member expression
        {
          code: 'api.client.request();',
          filename: 'src/api.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  // ---------------------------------------------------------------------
  // Layer 2 — direct unit tests for parser-unreachable branches
  // ---------------------------------------------------------------------

  /** Minimal SourceCode stub for direct hasNullCheck calls. */
  const sourceCodeStub = {
    getText: () => '',
  } as unknown as TSESLint.SourceCode;

  describe('Layer 2: hasNullCheck defensive early returns', () => {
    it('returns true for a node that itself is optional (?.)', () => {
      const node = {
        type: 'MemberExpression',
        optional: true,
      } as unknown as TSESTree.MemberExpression;
      expect(hasNullCheck(node, sourceCodeStub)).toBe(true);
    });

    it('returns true when the parent is a ChainExpression', () => {
      const node = {
        type: 'MemberExpression',
        optional: false,
        parent: { type: 'ChainExpression' },
        object: { type: 'Identifier', name: 'obj' },
      } as unknown as TSESTree.MemberExpression;
      expect(hasNullCheck(node, sourceCodeStub)).toBe(true);
    });
  });

  describe('Layer 2: listeners with mock context', () => {
    /** Synthetic `<name>.prop` member expression with configurable range/loc. */
    function syntheticMember(overrides: Record<string, unknown> = {}): TSESTree.MemberExpression {
      return {
        type: 'MemberExpression',
        optional: false,
        object: { type: 'Identifier', name: 'maybe' },
        property: { type: 'Identifier', name: 'prop' },
        ...overrides,
      } as unknown as TSESTree.MemberExpression;
    }

    it('falls back to loc-based keys when range is missing (with and without loc.end)', () => {
      const { listeners, reports } = createWithMockContext(noMissingNullChecks, {
        // null options also drive the `options || {}` fallback in create()
        options: [null],
      });
      const check = listeners['MemberExpression'] as (n: TSESTree.MemberExpression) => void;

      // range missing, full loc (start + end)
      check(syntheticMember({ loc: { start: { line: 1, column: 2 }, end: { line: 1, column: 9 } } }));
      // range missing, loc without end → start-based fallback in the key
      check(syntheticMember({ loc: { start: { line: 3, column: 4 } } }));
      // range too short for a range key
      check(syntheticMember({ range: [7] }));
      // neither range nor loc → JSON-hash fallback key. The hash uses only
      // the first 50 JSON chars, so a leading marker field keeps this node's
      // key distinct from the previous fallback node's key.
      check({
        marker: 'no-range-no-loc',
        ...syntheticMember(),
      } as unknown as TSESTree.MemberExpression);

      expect(reports).toHaveLength(4);
      for (const report of reports) {
        expect(report).toMatchObject({ messageId: 'missingNullCheck' });
      }
    });

    it('swallows report() errors in checkMemberExpression and still records the key', () => {
      let reportCalls = 0;
      // createWithMockContext's recorder never throws, so override report on
      // the returned context with a throwing stub to reach the catch branch.
      const throwing = createWithMockContext(noMissingNullChecks, {});
      (throwing.context as { report: (d: unknown) => void }).report = () => {
        reportCalls++;
        throw new Error('boom');
      };
      const check = throwing.listeners['MemberExpression'] as (n: TSESTree.MemberExpression) => void;
      const node = syntheticMember({ range: [0, 10] });

      expect(() => check(node)).not.toThrow();
      expect(reportCalls).toBe(1);
      // The key was recorded before report threw → second call dedupes and
      // does not attempt another report.
      check(syntheticMember({ range: [0, 10] }));
      expect(reportCalls).toBe(1);
    });

    it('checkCallExpression ignores nodes that are not CallExpressions', () => {
      const { listeners, reports } = createWithMockContext(noMissingNullChecks, {});
      const check = listeners['CallExpression'] as (n: unknown) => void;
      check(syntheticMember({ range: [0, 10] }));
      expect(reports).toHaveLength(0);
    });

    it('checkCallExpression skips a callee member whose parent is a ChainExpression', () => {
      const { listeners, reports } = createWithMockContext(noMissingNullChecks, {});
      const check = listeners['CallExpression'] as (n: unknown) => void;
      const member = syntheticMember({ parent: { type: 'ChainExpression' }, range: [0, 10] });
      check({ type: 'CallExpression', callee: member, arguments: [] });
      expect(reports).toHaveLength(0);
    });

    it('checkCallExpression dedupes an already-reported member expression', () => {
      const { listeners, reports } = createWithMockContext(noMissingNullChecks, {});
      const check = listeners['CallExpression'] as (n: unknown) => void;
      const call = {
        type: 'CallExpression',
        callee: syntheticMember({ range: [5, 20] }),
        arguments: [],
      };
      check(call);
      expect(reports).toHaveLength(1);
      expect(reports[0]).toMatchObject({ messageId: 'missingNullCheck' });
      // Same range → same key → dedupe path returns without reporting
      check({
        type: 'CallExpression',
        callee: syntheticMember({ range: [5, 20] }),
        arguments: [],
      });
      expect(reports).toHaveLength(1);
    });

    it('swallows report() errors in checkCallExpression', () => {
      let reportCalls = 0;
      const throwing = createWithMockContext(noMissingNullChecks, {});
      (throwing.context as { report: (d: unknown) => void }).report = () => {
        reportCalls++;
        throw new Error('boom');
      };
      const check = throwing.listeners['CallExpression'] as (n: unknown) => void;
      const call = {
        type: 'CallExpression',
        callee: syntheticMember({ range: [30, 40] }),
        arguments: [],
      };
      expect(() => check(call)).not.toThrow();
      expect(reportCalls).toBe(1);
    });
  });
});
