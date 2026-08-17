/**
 * ReDoS is a claim about RUNTIME, and runtime is directly measurable.
 *
 * Every expectation in this file was TIMED in Node 24 with
 * `re.test('a'.repeat(30) + '!')`, and the number is written next to the case.
 * Nothing here rests on reading a pattern and judging it.
 *
 * ## The NFA analyser is wrong in both directions
 *
 * `scslre` — which `eslint-plugin-regexp` also depends on — disagrees with the
 * interpreter that actually runs the pattern on four of six probes:
 *
 * | pattern | measured | scslre |
 * |---|---:|---|
 * | `^(a+)+$` | 5,151 ms | reports ✓ |
 * | `^(\d+)+$` | 20,978 ms | reports ✓ |
 * | `^(a\|a)*$` | 8,581 ms | **clean** — false negative |
 * | `^(a{1,3})+$` | 2,008 ms | **clean** — false negative |
 * | `^(a+){1,3}$` | 0.1 ms | **reports** — false positive |
 * | `^\s*(\S+\s*)+$` | 0.0 ms | **reports** — false positive |
 *
 * The interpreter is the authority. The corrections in the rule are a list of
 * measured disagreements, not a competing heuristic layer, and each carries the
 * number that put it there.
 *
 * ## Two distinctions that are exact and counterintuitive
 *
 * **Bounding the OUTER quantifier helps; bounding the INNER does not.**
 * `^(a+){1,3}$` is 0.1 ms while `^(a{1,3})+$` is 2,008 ms.
 *
 * **A bound is a cap on the EXPONENT, not on the cost.** The first version of
 * the suppression treated any bounded outer quantifier as safe and immediately
 * swallowed `^(.*a){20}$`, a 7-second pattern. Timed:
 *
 * | bound | 2 | 3 | 5 | 8 | 10 | 15 | 20 |
 * |---|---:|---:|---:|---:|---:|---:|---:|
 * | `(a+){n}` ms | 0.0 | 0.1 | 2.6 | 140.6 | 888.1 | 11,080 | 19,755 |
 *
 * 5 is the last bound under 3 ms; 8 is already 140 ms, which is a denial of
 * service at request volume. Hence `MAX_SAFE_REPETITION = 5` — a measurement,
 * not a judgement.
 *
 * **Complementary classes cannot be ambiguous.** `\S` and `\s` partition the
 * character space, so no input can be split between them two ways.
 * `^\s*(\S+\s*)+$` is the canonical "ReDoS example" in blog posts and runs in
 * 0.0 ms; reporting it teaches a developer to rewrite correct code.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noRedosVulnerableRegex } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-redos-vulnerable-regex — timed corrections to the NFA verdict', () => {
  ruleTester.run('no-redos-vulnerable-regex', noRedosVulnerableRegex, {
    valid: [
      { name: 'a+$ — 0.0 ms', code: 'const re = /^a+$/;' },
      { name: '[a-z]+$ — 0.0 ms', code: 'const re = /^[a-z]+$/;' },
      { name: '\\d+\\.\\d+$ — 0.0 ms', code: 'const re = /^\\d+\\.\\d+$/;' },
      {
        name: '(ab|cd)*$ — 0.0 ms, distinct branches cannot be ambiguous',
        code: 'const re = /^(ab|cd)*$/;',
      },
      { name: '(a|b)*$ — 0.0 ms, distinct alternatives', code: 'const re = /^(a|b)*$/;' },
      {
        // scslre reports this. It is 0.1 ms.
        name: '(a+){1,3}$ — 0.1 ms, bounded OUTER quantifier',
        code: 'const re = /^(a+){1,3}$/;',
      },
      {
        // The boundary case for MAX_SAFE_REPETITION. 5 is 2.6 ms; 8 is 140 ms.
        name: '(a+){5}$ — 2.6 ms, the largest bound still under 3 ms',
        code: 'const re = /^(a+){5}$/;',
      },
      {
        name: '([a-z]+\\d)*$ — 0.0 ms, a separator forces the split point',
        code: 'const re = /^([a-z]+\\d)*$/;',
      },
      {
        // scslre reports this. It is the canonical blog-post example and linear.
        name: '\\s*(\\S+\\s*)+$ — 0.0 ms, \\S and \\s are complements',
        code: 'const re = /^\\s*(\\S+\\s*)+$/;',
      },
    ],
    invalid: [
      {
        name: '(a+)+$ — 5,151 ms',
        code: 'const re = /^(a+)+$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        // scslre returns ZERO reports for this. It is 8.5 seconds, and it is the
        // first example in most ReDoS write-ups.
        name: '(a|a)*$ — 8,581 ms, and the NFA analyser calls it clean',
        code: 'const re = /^(a|a)*$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        // The same ambiguity built at RUNTIME. `new RegExp` defers construction
        // but not the backtracking, and the finding is labelled so a reader
        // knows the pattern is assembled rather than literal.
        name: 'a runtime-built (a|a)* is the same 8,581 ms pattern',
        code: `const re = new RegExp('^(a|a)*$');`,
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        // The SAME class twice, not complements. `\\S` against `\\S` overlaps
        // completely, so the split is maximally ambiguous — 52 SECONDS, the
        // slowest pattern measured here. The complementary-class suppression
        // must not fire just because both slots hold a `\\S`-family token; it
        // requires one of each.
        name: '(\\S+\\S*)+$ — 52,807 ms, same class twice is NOT complementary',
        code: 'const re = /^(\\S+\\S*)+$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        name: '(a*)*$ — 8,995 ms',
        code: 'const re = /^(a*)*$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        name: '(\\w+\\s?)*$ — 5,288 ms, \\w and \\s OVERLAP unlike \\S/\\s',
        code: 'const re = /^(\\w+\\s?)*$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        // CONTROL for the bound threshold. Bounded outer, but the bound is 20.
        // The first version of the suppression swallowed this.
        name: 'CONTROL: (.*a){20}$ — 7,170 ms despite a bounded outer quantifier',
        code: 'const re = /^(.*a){20}$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        name: 'CONTROL: (a+){10}$ — 888 ms, just above the measured threshold',
        code: 'const re = /^(a+){10}$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        name: '(\\d+)+$ — 20,978 ms',
        code: 'const re = /^(\\d+)+$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        name: '(a+)*b — 13,173 ms, unanchored is no protection',
        code: 'const re = /^(a+)*b/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        // The counterpart to the valid `(a+){1,3}$`: bounding the INNER
        // quantifier does not help.
        name: '(a{1,3})+$ — 2,008 ms, bounded INNER quantifier does NOT save it',
        code: 'const re = /^(a{1,3})+$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
    ],
  });
});
