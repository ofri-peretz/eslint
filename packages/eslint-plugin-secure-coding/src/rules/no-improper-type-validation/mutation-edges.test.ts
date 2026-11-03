/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-11-02).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noImproperTypeValidation } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

const typeofCheck = [{ messageId: 'unsafeTypeofCheck' as const }];
const loose = [{ messageId: 'looseEqualityTypeCheck' as const }];

describe('no-improper-type-validation (mutation edges)', () => {
  ruleTester.run('no-improper-type-validation', noImproperTypeValidation, {
    valid: [
      {
        name: 'a test file is skipped',
        filename: 'src/types.test.ts',
        code: "if (typeof value === 'object') {}",
      },
      {
        name: 'a loose typeof inequality in an || chain is guarded by its null test',
        code: "if (value === null || typeof value != 'object') {}",
      },
      {
        name: 'a guarded typeof check nested in a wider || is still guarded',
        code: "const ok = fallback || (value && typeof value === 'object');",
      },
      {
        name: 'two String() conversions are both strings (strict mode: conversions are not sanitizers)',
        options: [{ strictMode: true }],
        code: 'if (String(a) == String(b)) {}',
      },
      {
        name: 'Number() and parseInt() are both numbers (strict mode: conversions are not sanitizers)',
        options: [{ strictMode: true }],
        code: 'if (Number(a) == parseInt(b)) {}',
      },
      {
        name: 'two parseInt() results are both numbers (strict mode: conversions are not sanitizers)',
        options: [{ strictMode: true }],
        code: 'if (parseInt(a) == parseInt(b)) {}',
      },
      {
        name: 'a relational comparison of a typeof is not a type test',
        code: "if (typeof value < 'object') {}",
      },
      {
        name: "an awaited value compared to 'object' is not a typeof test",
        code: "async function f(x) { if ((await resolveType(x)) === 'object') {} }",
      },
      {
        name: "comparing a plain value to 'object' is not a typeof test",
        code: "if (kind === 'object') {}",
      },
      {
        name: 'with instanceof disallowed, other operators are not instanceof',
        options: [{ allowInstanceofSameRealm: false }],
        code: 'const s = a + b;',
      },
      {
        name: 'a constructor length is not the constructor name',
        code: 'if (obj.constructor.length === 1) {}',
      },
    ],
    invalid: [
      {
        name: 'this is not the operand it guards',
        code: "if (this && typeof value === 'object') {}",
        errors: typeofCheck,
      },
      {
        name: 'a computed read with an identifier key is not the dotted read',
        code: "if (obj[key] != null && typeof obj.key === 'object') {}",
        errors: typeofCheck,
      },
      {
        name: 'a negation other than ! is not a null test',
        code: "if (-value || typeof value !== 'object') {}",
        errors: typeofCheck,
      },
      {
        name: 'a negated operand on the && side does not exclude null',
        code: "if (!value && typeof value === 'object') {}",
        errors: typeofCheck,
      },
      {
        name: 'instanceof does not exclude null on the || side',
        code: "if (value instanceof Map || typeof value !== 'object') {}",
        errors: typeofCheck,
      },
      {
        name: 'instanceof on another operand does not guard this one',
        code: "if (other instanceof Map && typeof value === 'object') {}",
        errors: typeofCheck,
      },
      {
        name: 'a !== null test on the || side has the wrong polarity',
        code: "if (value !== null || typeof value !== 'object') {}",
        errors: typeofCheck,
      },
      {
        name: 'comparing to another value is not a null test',
        code: "if (fallback !== value && typeof value === 'object') {}",
        errors: typeofCheck,
      },
      {
        name: 'a truthy disjunction does not guard its first operand',
        code: "if ((value || fallback) && typeof value === 'object') {}",
        errors: typeofCheck,
      },
      {
        name: 'a number loosely compared to a boolean coerces',
        code: 'if (1 == true) {}',
        errors: loose,
      },
      {
        name: 'a String() and a Number() coerce (strict mode: conversions are not sanitizers)',
        options: [{ strictMode: true }],
        code: 'if (String(a) == Number(b)) {}',
        errors: loose,
      },
      {
        name: 'each binding is typed from its own declaration',
        code: "const label = 'a'; const count = 5; if (count == label) {}",
        errors: loose,
      },
    ],
  });
});
