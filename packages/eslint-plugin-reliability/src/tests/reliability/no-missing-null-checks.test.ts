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
          name: 'optional chaining guards the read',
          code: 'obj?.property;',
        },
        {
          name: 'optional chaining on every link of a method chain',
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
          code: 'let obj; const x = obj.prop ?? fallback;',
        },
        {
          code: 'let obj; const nested = obj.a.b ?? "default";',
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
          code: 'let obj; if (obj !== null) { obj.property; }',
        },
        // obj != null pattern
        {
          code: 'let obj; if (obj != null) { obj.property; }',
        },
        // obj !== undefined pattern
        {
          code: 'let obj; if (obj !== undefined) { obj.property; }',
        },
        // null !== obj pattern (reversed)
        {
          code: 'let obj; if (null !== obj) { obj.property; }',
        },
        // undefined !== obj pattern (reversed)
        {
          code: 'let obj; if (undefined !== obj) { obj.property; }',
        },
        // Logical expression with null checks
        {
          code: 'let obj; if (obj !== null && obj !== undefined) { obj.property; }',
        },
        // Logical expression checking right side
        {
          code: 'let obj; if (someCondition && obj !== null) { obj.property; }',
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
          code: 'let obj; if (obj) { obj.property; }',
          filename: 'src/utils.ts',
        },
        {
          code: 'let user; if (user) { user.name; }',
          filename: 'src/utils.ts',
        },
        {
          code: 'let response; if (response) { response.data.items; }',
          filename: 'src/utils.ts',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - short-circuit AND guard', noMissingNullChecks, {
      valid: [
        // obj && obj.prop — left-side guard proves right side is safe
        {
          code: 'let obj; const x = obj && obj.property;',
          filename: 'src/utils.ts',
        },
        {
          code: 'let user; const r = user && user.name;',
          filename: 'src/utils.ts',
        },
        {
          code: 'let config; const v = config && config.enabled;',
          filename: 'src/utils.ts',
        },
      ],
      invalid: [],
    });

    ruleTester.run('valid - ternary guard', noMissingNullChecks, {
      valid: [
        // obj ? obj.prop : fallback — truthy test guards consequent
        {
          code: 'let obj; const x = obj ? obj.property : null;',
          filename: 'src/utils.ts',
        },
        {
          code: 'let user; const name = user ? user.name : "anonymous";',
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
          code: 'let obj; obj.property;',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
        {
          code: 'let obj; obj.method();',
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
          name: 'a property read off a binding that is still undefined',
          code: 'let obj; const x = obj.property;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Method call without null check
        {
          code: 'let obj; obj.method();',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Nested property access
        {
          code: 'let value; const x = value.nested.deep;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Property access in expression
        {
          code: 'let data; const result = data.items.length;',
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
          code: 'let service; service.fetchData();',
          filename: 'src/api.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Method call with arguments
        {
          code: 'let handler; handler.process(data);',
          filename: 'src/processor.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Chained method call without optional chaining
        {
          code: 'let response; response.data.map(x => x);',
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
          code: 'let api; const value = api.response.data.items;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Method on nested property
        {
          code: 'let config; config.settings.getValue();',
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
          code: 'let obj; obj.property;',
          filename: 'component.test.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Spec file with ignoreInTests = false
        {
          code: 'let service; service.method();',
          filename: 'api.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  /**
   * The contract this rule USED to have, retired deliberately.
   *
   * Every case here was an `invalid` fixture asserting that an unrecognised
   * initializer makes a value nullable. That premise is what produced 38,674
   * findings across the 8 pinned repositories — where all five security
   * plugins together produce 36 — because it is true of very nearly every
   * value in every program.
   *
   * `const p = Promise.resolve(1); p.field;` is the clearest evidence the old
   * contract was wrong rather than merely noisy: `Promise.resolve()` cannot
   * return null, and the suite pinned it as a MUST-REPORT.
   *
   * A finding now needs positive evidence of nullability. These have none, so
   * they are valid — and they are kept, rather than deleted, so the reversal
   * is visible to whoever reads this next.
   */
  describe('Retired contract — an unrecognised initializer is not evidence', () => {
    ruleTester.run('valid - no nullability evidence', noMissingNullChecks, {
      valid: [
        {
          name: 'an awaited call is not evidence of nullability',
          code: 'async function f() { const r = await getData(); r.field; }',
          filename: 'src/utils.ts',
        },
        { code: 'async function f() { const r = await pending; r.field; }', filename: 'src/utils.ts' },
        { code: 'async function f() { const r = await client.get(url); r.field; }', filename: 'src/utils.ts' },
        {
          name: 'an unrecognised call result is not evidence of nullability',
          code: 'const v = compute(); v.field;',
          filename: 'src/utils.ts',
        },
        // Promise.resolve() never returns null. This was pinned as must-report.
        { code: 'const p = Promise.resolve(1); p.field;', filename: 'src/utils.ts' },
        { code: 'function outer() { const conn = connect(); function inner() { conn.close(); } }', filename: 'src/utils.ts' },
        // The corpus shapes that dominated what survived the first cut.
        {
          name: 'a for…of head binds its variable — it is not `let x;`',
          code: 'for (const item of items) { item.name; }',
          filename: 'src/utils.ts',
        },
        { code: 'for (const key in obj) { obj[key].name; }', filename: 'src/utils.ts' },
        // Deferred initialisation: written later, so not a read of undefined.
        { code: 'let cfg; if (linked) { cfg = load(); } else { cfg = defaults(); } cfg.file;', filename: 'src/utils.ts' },
        // An ambient declaration has no initializer BY DEFINITION — the value
        // is defined elsewhere and `declare` only names its type.
        {
          name: 'declare const — an ambient binding has no initializer by definition',
          code: 'declare const source: { getPage(slug?: string[]): unknown }; source.getPage();',
          filename: 'src/utils.ts',
        },
        {
          name: 'declare let — same, through the CallExpression-free path',
          code: 'declare let config: { file: string }; config.file;',
          filename: 'src/utils.ts',
        },
      ],
      invalid: [],
    });
  });

  /**
   * The adversarial wave.
   *
   * Written to BREAK the narrowed rule rather than to confirm it, and it did:
   * 11 of 14 genuine null-dereferences walked past the first cut. The two
   * fixed here were the ones a user would hit by accident.
   *
   * `const alias = hit` defeated the gate completely — one level of aliasing
   * laundered the evidence — and a conditional with a `null` arm was read as
   * carrying no evidence at all.
   *
   * Nine of the eleven are still missed and recorded in the rule's SEAL record
   * rather than hidden (a tenth gap, the self-referential `var a = a`, came out
   * of covering the cycle guard rather than out of the wave): evidence crossing a function return, destructuring off a nullable
   * value, a read after an optional link (`hit?.meta.deep`), an out-of-bounds
   * array index, `Map.get`, `JSON.parse`, a binding written only in dead code,
   * a `for…of` over a nullable source, and reassignment from a nullable call.
   * Each needs analysis the rule does not have, and none is silently accepted.
   */
  describe('Adversarial — evidence must not launder', () => {
    ruleTester.run('invalid - laundered evidence still reports', noMissingNullChecks, {
      valid: [
        // An alias of something with NO evidence is still no evidence.
        { code: 'export function f(o) { const a = o; return a.name; }', filename: 'src/u.ts' },
        // A real guard still silences it.
        {
          code: 'export function f(rows) { const hit = rows.find((r) => r.ok); return hit ? hit.name : null; }',
          filename: 'src/u.ts',
        },
        // A user shadow of `undefined` is a real binding, so the arm is not
        // the language's undefined.
        {
          code: 'export function f(flag) { const undefined = {}; const c = flag ? undefined : {}; return c.name; }',
          filename: 'src/u.ts',
        },
        // Declare-then-assign. `let x = null` followed by a real assignment is
        // the most common shape in JavaScript, and reading it as "this is null"
        // reported every use that followed — 4,954 findings on the 20-repository
        // ledger, from an inconsistency in this gate: the zero-writes rule was
        // applied to the uninitialised case and not to this one. The FN guard
        // is `const nothing = null` above: a const cannot be reassigned, so a
        // genuine null binding still reports.
        {
          code:
            'export function f(result) { let childModel = null; childModel = result.childModel; return childModel.hooks; }',
          filename: 'src/u.ts',
        },
        // A conditional whose arms carry no evidence carries none either.
        {
          code: 'export function f(a, b, c) { const chosen = c ? a : b; return chosen.name; }',
          filename: 'src/u.ts',
        },
        {
          // `var a = a` is legal JavaScript and self-referential, so the alias
          // walk would recurse on the same binding forever. The cycle guard
          // answers "no evidence" instead of hanging.
          //
          // Reported as VALID deliberately: this really is a read of undefined,
          // but the honest answer from a walk that cannot terminate is silence,
          // not a guess. Recorded as a known gap in the SEAL record.
          code: 'export function f() { var a = a; return a.name; }',
          filename: 'src/u.ts',
        },
      ],
      invalid: [
        {
          name: 'one alias does not launder a nullable return',
          code: 'export function f(rows) { const hit = rows.find((r) => r.ok); const alias = hit; return alias.name; }',
          filename: 'src/u.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'nor does a chain of them',
          code: 'export function f(rows) { const a = rows.find((r) => r.ok); const b = a; const c = b; return c.name; }',
          filename: 'src/u.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'a conditional is nullable when either arm is',
          code: 'export function f(rows, c) { const hit = c ? rows.find((r) => r.ok) : null; return hit.name; }',
          filename: 'src/u.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'a conditional arm that is itself an alias still carries evidence',
          code:
            'export function f(rows, c) { const hit = rows.find((r) => r.ok); const chosen = c ? hit : null; return chosen.name; }',
          filename: 'src/u.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          // A later write cannot un-read an earlier dereference. The write
          // check inspected EVERY non-initializer write regardless of position,
          // so a reassignment further down excused a read of null above it.
          // Raised by CodeRabbit on #599.
          name: 'a read before the reassignment still reports',
          code:
            'export function f(result) { let m = null; const hooks = m.hooks; m = result.m; return hooks; }',
          filename: 'src/u.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          // A bare `undefined` arm is the same evidence as a `null` one.
          // Raised by CodeRabbit on #599 — the alias walk swallowed it, because
          // resolving the GLOBAL `undefined` finds a variable with no
          // definitions and answers "no evidence".
          name: 'an undefined arm is evidence too',
          code: 'export function f(flag) { const c = flag ? undefined : {}; return c.name; }',
          filename: 'src/u.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          // The alias is resolved from the DECLARATOR's scope, not the read's,
          // so a nested function rebinding the same name cannot answer for it.
          name: 'a nested shadow does not launder the alias',
          code:
            'export function f(rows) { const hit = rows.find((r) => r.ok); const alias = hit; function g() { const hit = {}; return alias.name; } return g(); }',
          filename: 'src/u.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'either arm, in either position',
          code: 'export function f(rows, c) { const hit = c ? null : rows.find((r) => r.ok); return hit.name; }',
          filename: 'src/u.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  /**
   * The contract that REPLACES it: a finding needs positive evidence.
   *
   * Each case names the platform or the binding that says the value may be
   * null — not the shape of the surrounding code, and never the identifier's
   * name.
   */
  describe('Evidence-based nullability', () => {
    ruleTester.run('invalid - evidence of nullability', noMissingNullChecks, {
      valid: [
        // `.get` is deliberately not a nullable return — see NULLABLE_RETURNS.
        { code: 'const v = cache.get(k); v.field;', filename: 'src/utils.ts' },
        // A parameter says nothing without types.
        { code: 'function f(user) { return user.name; }', filename: 'src/utils.ts' },
      ],
      invalid: [
        {
          // Array.prototype.find returns undefined on a miss — the path nobody
          // writes a test for. Shopify/cli and okta-auth-js both do this.
          code: 'const hit = rows.find(r => r.id === id); hit.name;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          // String.prototype.match returns null on a non-match. This exact
          // shape is `bin/create-notification-pr.js:136` on the pinned corpus.
          code: 'const m = line.match(/^#\\s+(.*)$/); m[1].trim();',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          code: 'const m = re.exec(input); m.index;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          code: 'const el = document.getElementById("root"); el.style;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          code: 'const el = root.querySelector(".x"); el.textContent;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          // Never written, so the read is unambiguously of undefined.
          code: 'let pending; pending.field;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          code: 'const nothing = undefined; nothing.field;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          // An irrelevant guard must not suppress a finding that HAS evidence.
          code: 'const hit = rows.find(r => r.ok); if (ready) { hit.name; }',
          filename: 'src/utils.ts',
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
          code: 'let myVar; myVar.field;',
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
          code: 'let obj; const x = wrapper.obj && obj.prop;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Unrelated left side does not guard
        {
          code: 'let obj; const x = flag && obj.prop;',
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
          code: 'let obj; const x = cond ? obj.prop : fallback;',
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
          code: 'let obj; if (ready) { obj.prop; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Binary comparison that is not a null check
        {
          code: 'let obj; if (count > 5) { obj.prop; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        // Null comparison against a DIFFERENT object
        {
          code: 'let obj; if (other !== null) { obj.prop; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });

  /**
   * A falsy guard that LEAVES is a null check for everything after it.
   *
   *   const hit = rows.find(r => r.ok)
   *   if (!hit) return null
   *   return hit.name              // hit is non-null here
   *
   * `isNullCheckForObject` deliberately skips `if (!obj)`: inside the guard
   * the object is null, so the old note said "only safe when paired with early
   * return, which requires control-flow analysis". The analysis needed is
   * narrower than that — a preceding sibling statement whose falsy test names
   * the object and whose consequent ends in return / throw / continue / break
   * cannot fall through, so nothing after it in the same statement list runs
   * with the object null. This is the shape every `getOrNotFound` helper has,
   * and the rule reported the return on every one of them.
   */
  describe('Guard Analysis — falsy guard followed by an early exit', () => {
    ruleTester.run('valid - early exit guards the statements after it', noMissingNullChecks, {
      valid: [
        {
          name: 'if (!x) return — the shape of every getOrNotFound helper',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!hit) return null; return hit.name; }',
          filename: 'src/utils.ts',
        },
        {
          name: 'if (!x) throw',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!hit) throw new Error("missing"); return hit.name; }',
          filename: 'src/utils.ts',
        },
        {
          name: 'block consequent whose LAST statement exits',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!hit) { log("miss"); return; } hit.name; }',
          filename: 'src/utils.ts',
        },
        {
          name: 'continue inside a loop body',
          code: 'function f(rows, keys) { for (const k of keys) { const hit = rows.find(r => r.k === k); if (!hit) continue; hit.name; } }',
          filename: 'src/utils.ts',
        },
        {
          name: 'break inside a loop body',
          code: 'function f(rows) { while (true) { const hit = rows.find(r => r.ok); if (!hit) break; hit.name; } }',
          filename: 'src/utils.ts',
        },
        {
          name: '=== undefined is the same falsy guard',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (hit === undefined) return; return hit.name; }',
          filename: 'src/utils.ts',
        },
        {
          name: '== null, mirrored',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (null == hit) throw new Error(); hit.name; }',
          filename: 'src/utils.ts',
        },
        {
          name: '`!x || other` — the guard fires whenever x is falsy',
          code: 'function f(rows, stale) { const hit = rows.find(r => r.ok); if (!hit || stale) return; return hit.name; }',
          filename: 'src/utils.ts',
        },
        {
          name: '`other || !x` — same, guard on the right',
          code: 'function f(rows, stale) { const hit = rows.find(r => r.ok); if (stale || hit == null) return; return hit.name; }',
          filename: 'src/utils.ts',
        },
        {
          name: 'the guard covers statements nested deeper than itself',
          code: 'function f(rows, c) { const hit = rows.find(r => r.ok); if (!hit) return; if (c) { hit.name; } }',
          filename: 'src/utils.ts',
        },
        {
          name: 'method call after the guard (CallExpression path)',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!hit) return; hit.run(); }',
          filename: 'src/utils.ts',
        },
        {
          name: 'an else branch does not weaken the guard',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!hit) return; else warm(); return hit.name; }',
          filename: 'src/utils.ts',
        },
        {
          name: 'module scope — the guard is a preceding sibling in Program.body',
          code: 'const el = document.getElementById("root"); if (!el) throw new Error("no root"); el.style;',
          filename: 'src/utils.ts',
        },
        {
          name: 'switch case — break leaves the case',
          code: 'function f(rows, k) { switch (k) { case 1: { const hit = rows.find(r => r.ok); if (!hit) break; hit.name; } } }',
          filename: 'src/utils.ts',
        },
        {
          name: 'a closure created after the guard reads the same binding',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!hit) return; const g = () => hit.name; return g; }',
          filename: 'src/utils.ts',
        },
        {
          name: '`!other || !x` — the arm that names x is enough',
          code: 'function f(rows, other) { const hit = rows.find(r => r.ok); if (!other || !hit) return; return hit.name; }',
          filename: 'src/utils.ts',
        },
        {
          name: 'switch case consequent is itself a statement list',
          code: 'function f(rows, k) { const hit = rows.find(r => r.ok); switch (k) { case 1: if (!hit) break; hit.name; } }',
          filename: 'src/utils.ts',
        },
      ],
      invalid: [
        {
          name: 'a consequent that does not leave proves nothing',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!hit) log("miss"); return hit.name; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'a block whose exit is not last proves nothing',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!hit) { return; log("dead"); } return hit.name; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'an empty block proves nothing',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!hit) {} return hit.name; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'the read BEFORE the guard is the bug the guard was written for',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); const n = hit.name; if (!hit) return; return n; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'a guard inside a nested block does not cover the outer list',
          code: 'function f(rows, c) { const hit = rows.find(r => r.ok); if (c) { if (!hit) return; } return hit.name; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: '`!x && other` leaves only when both hold',
          code: 'function f(rows, c) { const hit = rows.find(r => r.ok); if (!hit && c) return; return hit.name; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'a TRUTHY exit guard leaves x null afterwards',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (hit) return; return hit.name; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'a guard on a different binding',
          code: 'function f(rows, other) { const hit = rows.find(r => r.ok); if (!other) return; return hit.name; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'a read inside the guard itself is the dereference of null',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!hit) { hit.name; return; } }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'an outer guard does not cover a SHADOWING inner binding (block)',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!hit) return; { let hit; hit.name; } }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'an outer guard does not cover a SHADOWING inner binding (nested function)',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!hit) return; function g(rows2) { const hit = rows2.find(r => r.ok); return hit.name; } return g; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'a guard on an undeclared name proves nothing',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (!missing) return; return hit.name; }',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'same binding, different member — `if (!a.b)` does not guard `a.c`',
          code: 'let a; if (!a.b) return; a.c.d;',
          filename: 'src/utils.ts',
          errors: [{ messageId: 'missingNullCheck' }, { messageId: 'missingNullCheck' }],
        },
        {
          name: 'a comparison that is not against null is not a null guard',
          code: 'function f(rows) { const hit = rows.find(r => r.ok); if (hit === 0) return; return hit.name; }',
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
          code: 'let api; api.client.request();',
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
    /**
     * A scope in which `maybe` is `let maybe;` — declared, never written.
     *
     * These layer-2 tests exercise the dedupe-key and report-error paths, not
     * nullability. Since the rule became evidence-based they need a scope that
     * actually supplies the evidence, or every one of them asserts nothing:
     * the listener returns before it can reach the code under test.
     */
    const scopeWithUninitialisedMaybe = {
      upper: null,
      variables: [
        {
          name: 'maybe',
          references: [],
          defs: [{ type: 'Variable', node: { type: 'VariableDeclarator', init: null, parent: undefined } }],
        },
      ],
    } as unknown as TSESLint.Scope.Scope;

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
        scope: scopeWithUninitialisedMaybe,
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
      const throwing = createWithMockContext(noMissingNullChecks, { scope: scopeWithUninitialisedMaybe });
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
      const { listeners, reports } = createWithMockContext(noMissingNullChecks, { scope: scopeWithUninitialisedMaybe });
      const check = listeners['CallExpression'] as (n: unknown) => void;
      check(syntheticMember({ range: [0, 10] }));
      expect(reports).toHaveLength(0);
    });

    it('checkCallExpression skips a callee member whose parent is a ChainExpression', () => {
      const { listeners, reports } = createWithMockContext(noMissingNullChecks, { scope: scopeWithUninitialisedMaybe });
      const check = listeners['CallExpression'] as (n: unknown) => void;
      const member = syntheticMember({ parent: { type: 'ChainExpression' }, range: [0, 10] });
      check({ type: 'CallExpression', callee: member, arguments: [] });
      expect(reports).toHaveLength(0);
    });

    it('checkCallExpression dedupes an already-reported member expression', () => {
      const { listeners, reports } = createWithMockContext(noMissingNullChecks, { scope: scopeWithUninitialisedMaybe });
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
      const throwing = createWithMockContext(noMissingNullChecks, { scope: scopeWithUninitialisedMaybe });
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

  /**
   * Burgee — a CLI framework linted with this rule and NO type information —
   * turned the rule off over shapes TypeScript accepts as narrowing and this
   * file did not: `'value' in token ? token.value : …`, `if (found?.[1] !==
   * undefined) … found[1]`, and the early-return `if (m === null) return` before
   * `m[1]`. The third was already understood on main (4.1.4) and is pinned here
   * against the 4.1.3 the consumer ran; the `in` and optional-chain shapes fail
   * on the unfixed rule. See docs/intents/burgee-false-positives/.
   */
  describe('narrowing the consumer wrote and TypeScript accepts (burgee)', () => {
    ruleTester.run('in-narrowing and optional-chain guards', noMissingNullChecks, {
      valid: [
        {
          name: 'FP: `"k" in x` as a ternary test proves x is an object in the consequent',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'function f(tokens: any[]) { const token = tokens.find((t) => t.kind === "x"); const value = "value" in token ? token.value : undefined; return value; }',
        },
        {
          name: 'FP: `"k" in x` as an if test guards its consequent',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'function f(rows: any[]) { const hit = rows.find((r) => r.ok); if ("name" in hit) { return hit.name; } return "x"; }',
        },
        {
          name: 'FP: `x?.[1] !== undefined` proves x non-null for the read that follows',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'function hint(token: string) { const found = RE.exec(token); if (found?.[1] !== undefined) return "did you mean --" + found[1]; return undefined; }',
        },
        {
          name: 'FP: a truthy optional chain rooted at x guards x',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'function hint(token: string) { const found = RE.exec(token); if (found?.[1]) return found[1]; return undefined; }',
        },
        {
          name: 'FP: an optional-chain `!= null` test guards a dotted read',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'function f(rows: any[]) { const hit = rows.find((r) => r.ok); if (hit?.meta != null) return hit.meta.name; return ""; }',
        },
        {
          name: 'an optional chain through a CALL is rooted at x too — `hit?.get() != null`',
          code: 'function f(rows: any[]) { const hit = rows.find((r) => r.ok); if (hit?.get() != null) return hit.name; return ""; }',
        },
        {
          name: 'the nil literal on the LEFT of `!==` reads the same — `undefined !== found?.[1]`',
          code: 'function hint(token: string) { const found = RE.exec(token); if (undefined !== found?.[1]) return found[1]; return undefined; }',
        },
        {
          name: '`"k" in x` also guards a chain that STARTS with x — `hit.meta.name`',
          code: 'function f(rows: any[]) { const hit = rows.find((r) => r.ok); return "meta" in hit ? hit.meta.name : ""; }',
        },
        {
          name: 'FP: an optional-chain `!== undefined` ternary test guards its consequent',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'function hint(token: string) { const found = RE.exec(token); return found?.[1] !== undefined ? found[1] : undefined; }',
        },
        {
          name: 'FP: `if (m === null) return` before a computed read `m[1]` — reported by 4.1.3, understood since 4.1.4',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'function firstGroup(pattern: RegExp, line: string): string | undefined { const m = pattern.exec(line); if (m === null) return undefined; const group = m[1]; return group; }',
        },
        {
          name: 'FP: `if (m === null) return` before `m.at(1)`',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'function f(pattern: RegExp, line: string) { const m = pattern.exec(line); if (m === null) return undefined; return m.at(1); }',
        },
        {
          name: 'FP: the burgee token loop — a for-of variable carries no nullability evidence, and the `in` test narrows it besides',
          // @found real-source scan (burgee, ofri-peretz/burgee eslint.config.mjs)
          code: 'type Token = { kind: string; value?: string };\nfunction splitPositionals(tokens: readonly Token[]) { const positionals: string[] = []; for (const token of tokens) { const { kind } = token; const value = "value" in token ? token.value : undefined; if (kind === "positional" && typeof value === "string") positionals.push(value); } return positionals; }',
        },
      ],
      invalid: [
        {
          name: '`in` on a DIFFERENT object says nothing about this one',
          code: 'function f(rows: any[], other: object) { const hit = rows.find((r) => r.ok); return "name" in other ? hit.name : "x"; }',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'x on the LEFT of `in` is a key being looked up, not an object being narrowed',
          code: 'function f(rows: any[], bag: object) { const hit = rows.find((r) => r.ok); return hit in bag ? hit.name : "x"; }',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'the `in` test narrows the consequent, never the alternate',
          code: 'function f(rows: any[]) { const hit = rows.find((r) => r.ok); return "name" in hit ? "x" : hit.name; }',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'an optional chain compared to a value that is not nil proves nothing — `found?.[1] !== 0` passes when found is null',
          code: 'function hint(token: string) { const found = RE.exec(token); if (found?.[1] !== 0) return found[1]; return undefined; }',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'an optional chain compared EQUAL to undefined does not prove non-null',
          code: 'function hint(token: string) { const found = RE.exec(token); if (found?.[1] === undefined) return found[1]; return undefined; }',
          errors: [{ messageId: 'missingNullCheck' }],
        },
        {
          name: 'an optional chain rooted elsewhere guards nothing here',
          code: 'function hint(token: string, other: any) { const found = RE.exec(token); if (other?.[1] !== undefined) return found[1]; return undefined; }',
          errors: [{ messageId: 'missingNullCheck' }],
        },
      ],
    });
  });
});
