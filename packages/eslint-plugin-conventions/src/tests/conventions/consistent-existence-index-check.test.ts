/**
 * Tests for consistent-existence-index-check rule
 * Enforce consistent style for checking object property existence
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { consistentExistenceIndexCheck } from '../../rules/conventions/consistent-existence-index-check';

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

describe('consistent-existence-index-check', () => {
  describe('opting in to "in"', () => {
    // `in` is no longer the default — it is the one form of the three that answers
    // `true` for an INHERITED key, which is not where a default should point. These
    // cases now say so, rather than arriving there by omission.
    const IN = [{ preferred: 'in' as const }];

    ruleTester.run('prefer in operator', consistentExistenceIndexCheck, {
      valid: [
        { name: 'the `in` operator', code: '"key" in obj', options: IN },
        { code: 'if ("prop" in object) {}', options: IN },
        { code: 'const exists = "name" in user;', options: IN },
      ],
      invalid: [
        // hasOwnProperty should be flagged
        {
          name: 'hasOwnProperty walks the prototype question the long way',
          code: 'obj.hasOwnProperty("key")',
          options: IN,
          // Reported, not rewritten: `in` and an own-property check disagree on an
          // inherited key. See consistent-existence-index-check.own-property.test.ts.
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' }],
        },
        // Object.hasOwn should be flagged
        {
          code: 'Object.hasOwn(obj, "key")',
          options: IN,
          // Reported, not rewritten: `in` and an own-property check disagree on an
          // inherited key. See consistent-existence-index-check.own-property.test.ts.
          output: null,
          errors: [{ messageId: 'consistentExistenceCheck' }],
        },
      ],
    });
  });

  describe('prefer hasOwnProperty', () => {
    ruleTester.run('prefer hasOwnProperty', consistentExistenceIndexCheck, {
      valid: [
        // Using hasOwnProperty (preferred in this config)
        {
          code: 'obj.hasOwnProperty("key")',
          options: [{ preferred: 'hasOwnProperty' }],
        },
      ],
      invalid: [
        // 'in' operator should be flagged
        {
          code: '"key" in obj',
          // Reported, not rewritten: `in` and an own-property check disagree on an
          // inherited key. See consistent-existence-index-check.own-property.test.ts.
          output: null,
          options: [{ preferred: 'hasOwnProperty' }],
          errors: [{ messageId: 'consistentExistenceCheck' }],
        },
        // Object.hasOwn should be flagged
        {
          code: 'Object.hasOwn(obj, "key")',
          // Reported, not rewritten: the direct `obj.hasOwnProperty(k)` looks the
          // method up ON `obj`, so it throws on a null-prototype object and can hit
          // a shadowing own property. See the own-property test file.
          output: null,
          options: [{ preferred: 'hasOwnProperty' }],
          errors: [{ messageId: 'consistentExistenceCheck' }],
        },
      ],
    });
  });

  describe('prefer Object.hasOwn', () => {
    ruleTester.run('prefer Object.hasOwn', consistentExistenceIndexCheck, {
      valid: [
        // Using Object.hasOwn (preferred in this config)
        {
          code: 'Object.hasOwn(obj, "key")',
          options: [{ preferred: 'Object.hasOwn' }],
        },
      ],
      invalid: [
        // 'in' operator should be flagged
        {
          code: '"key" in obj',
          // Reported, not rewritten: `in` and an own-property check disagree on an
          // inherited key. See consistent-existence-index-check.own-property.test.ts.
          output: null,
          options: [{ preferred: 'Object.hasOwn' }],
          errors: [{ messageId: 'consistentExistenceCheck' }],
        },
        // hasOwnProperty should be flagged
        {
          code: 'obj.hasOwnProperty("key")',
          // Reported, not rewritten: the direct `obj.hasOwnProperty(k)` looks the
          // method up ON `obj`, so it throws on a null-prototype object and can hit
          // a shadowing own property. See the own-property test file.
          output: null,
          options: [{ preferred: 'Object.hasOwn' }],
          errors: [{ messageId: 'consistentExistenceCheck' }],
        },
      ],
    });
  });
  describe('the four spellings, and what is not one of them', () => {
    // FP/FN sweep 2026-09-15 against the burgee corpus.
    //
    // Both cases below are DETECTION-scope defects: the rule reported a construct
    // that is not one of the four documented spellings, and stayed silent on two
    // that are. Neither widens what `--fix` may rewrite — the direct
    // `hasOwnProperty` form always sets `crossesDispatchBoundary`, and the
    // `Object.hasOwn` visitor only runs when `Object.hasOwn` is NOT preferred, so
    // no fixer can reach any of these nodes.

    ruleTester.run(
      'detection scope, default options',
      consistentExistenceIndexCheck,
      {
        valid: [
          // NOT corpus-grounded: burgee has private fields (packages/burgee/src/
          // yargs/factory.ts:119) but writes no brand checks, so the sweep could
          // not surface this. Kept because the emitted advice is unsatisfiable:
          // `Object.hasOwn(o, #v)` is a SyntaxError, and a private name lives in
          // no prototype chain, so every rationale the docs give for reporting
          // `in` is false here.
          {
            name: 'a private-name brand check is not a spelling of "does obj have key"',
            code: 'class Box { #v = 1; static isBox(o) { return #v in o; } }',
          },
        ],
        invalid: [
          // burgee packages/compat-oracle/vendor/yargs/test/command.mjs:1534
          // (and :1558). Vendored, so burgee's own config does not lint it; the
          // defect is config-independent. `Object.prototype.hasOwnProperty(argv,
          // 'b')` dispatches off `Object.prototype` and asks whether it owns the
          // key "[object Object]" — always false. The one-argument spelling of
          // this same call IS reported today; only the argument count differed.
          {
            name: 'hasOwnProperty called through Object.prototype, with a surplus argument',
            code: "Object.prototype.hasOwnProperty(argv, 'b')",
            output: null,
            errors: [{ messageId: 'consistentExistenceCheck' }],
          },
          // Minimized from the same site. The native method ignores extras —
          // `({k:1}).hasOwnProperty('k','zzz') === true` — so the dispatch hazard
          // the docs name ("never call it through `obj`", stated with no arity
          // condition) is byte-for-byte the one-argument hazard.
          {
            name: 'a surplus argument does not disarm the direct-dispatch hazard',
            code: 'obj.hasOwnProperty(key, extra)',
            output: null,
            errors: [{ messageId: 'consistentExistenceCheck' }],
          },
          // The mirror of the same gate on the `Object.hasOwn` visitor, which
          // required exactly 2 arguments. Surplus arguments are evaluated, so the
          // fix stays withheld; the preference is still reported.
          {
            name: 'Object.hasOwn with a surplus argument is still the non-preferred spelling',
            code: 'Object.hasOwn(obj, key, extra)',
            options: [{ preferred: 'in' as const }],
            output: null,
            errors: [{ messageId: 'consistentExistenceCheck' }],
          },
        ],
      },
    );
  });
});
