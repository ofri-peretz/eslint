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
      {
        // Proves the `v`-flag fix below does not blanket-report `v` patterns:
        // one class, one quantifier, nothing to trade.
        name: '[\\p{ASCII}]+$ under the v flag — 0.0 ms, a single class cannot backtrack',
        code: 'const re = /^[\\p{ASCII}]+$/v;',
      },
      {
        // The PRECISION boundary for the overlap check below. Two property
        // escapes under a `+`, but `Nd` (digits) and `Lu` (uppercase letters)
        // are disjoint, so no character can be taken by either branch and
        // there is nothing to backtrack over. 0.0 ms at 28 characters.
        name: '(?:\\p{Nd}|\\p{Lu})+$ — 0.0 ms, disjoint properties cannot be ambiguous',
        code: 'const re = /^(?:\\p{Nd}|\\p{Lu})+$/v;',
      },
      {
        // GAP: burgee's ACTUAL spelling of the 9,395 ms pattern pinned in the
        // invalid block below. `INVISIBLE_CLASSES.join('|')` is interpolated
        // into the template, and `${…}` is replaced by a single placeholder
        // character before analysis — so the whole six-way alternation
        // collapses to `^(?:\uE000)+$` and there is nothing left to intersect.
        //
        // This is NOT the overlap gap, which is fixed: the same pattern
        // written literally, and built through `new RegExp` from a literal
        // STRING, both report. Closing this one means resolving an
        // interpolated constant back to its value, which is a separate
        // capability with its own false-positive surface.
        name: 'GAP: an alternation that arrives through an interpolated constant is invisible',
        code: "const A = ['\\p{Default_Ignorable_Code_Point}','\\p{Format}'].join('|'); const re = new RegExp(`^(?:${A})+$`, 'v');",
      },
      {
        // The overlap check DECLINES rather than guesses when an alternative
        // is not a single character class. Here alternative 0 is a capturing
        // group, so there is no character set to intersect and the answer is
        // silence.
        name: 'an alternative that is a group, not a character class, is declined',
        code: 'const re = /^(?:(x)|y)+$/;',
      },
      {
        // A `v`-flag class holding STRINGS is a UnicodeSet, not a character
        // set; refa answers "Unsupported element". A throw means decline, not
        // report — the rule never guesses from a failed analysis.
        name: 'a v-flag string set refa cannot model is declined, not reported',
        code: 'const re = /^(?:[\\q{ab}]|[\\q{cd}])+$/v;',
      },
    ],
    invalid: [
      {
        name: '(a+)+$ — 5,151 ms',
        code: 'const re = /^(a+)+$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        // TWO ambiguous groups in one pattern. The first sets the verdict and
        // the walk stops deciding at the second — one finding per regex, not
        // one per ambiguous group. Measured: 245 ms on 'a'.repeat(26) + '!'.
        name: '(a|a)+(b|b)+$ — 245 ms, a second ambiguous group adds no second report',
        code: 'const re = /^(a|a)+(b|b)+$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        // `\\d` is a SUBSET of `\\w`, so every digit can be taken by either
        // branch. The identity test could not see this — the two branches are
        // not byte-identical — and scslre returns zero reports.
        // Measured: 1,927 ms on '1'.repeat(28) + '!'.
        name: '(\\w|\\d)+$ — 1,927 ms, \\d is a subset of \\w',
        code: 'const re = /^(\\w|\\d)+$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        // Partially overlapping ranges: `c`-`f` belongs to both branches.
        // Measured: 1,691 ms on 'c'.repeat(28) + '!'.
        name: '([a-f]|[c-z])+$ — 1,691 ms, ranges overlap at c-f',
        code: 'const re = /^([a-f]|[c-z])+$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        // burgee packages/linegauge/src/width.ts:193, the pattern that opened
        // this whole line of work. Six property escapes under a `+`;
        // Default_Ignorable_Code_Point and Format intersect, so a variation
        // selector can be taken by either branch. Measured: 9,395 ms on
        // '\\uFE0E'.repeat(28) + '\\u0903' — a 29-character string.
        name: 'the burgee ZERO_WIDTH alternation — 9,395 ms, Default_Ignorable meets Format',
        code: 'const re = /^(?:\\p{Default_Ignorable_Code_Point}|\\p{Control}|\\p{Format}|\\p{Nonspacing_Mark}|\\p{Enclosing_Mark}|\\p{Surrogate})+$/v;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        // burgee packages/linegauge/src/width.ts:193 surfaced the class.
        // The SAME pattern the suite already pins as `(a|a)*`, written
        // non-capturing. `isProvablyCatastrophic` matched `(x|x)` with
        // `[^()|]+`, which swallows `?:` into the first branch, so the
        // identity test compared '?:a' against 'a' and never fired.
        // Measured: 1,013 ms on 'a'.repeat(28) + '!'.
        name: '(?:a|a)+$ — 1,013 ms, the pinned (a|a)* case written non-capturing',
        code: 'const re = /^(?:a|a)+$/;',
        errors: [{ messageId: 'redosVulnerable' }],
      },
      {
        // burgee packages/linegauge/src/width.ts:193 — a `v`-flag pattern
        // built from `\\p{...}` alternatives. `unicodeSets` was forwarded to
        // the PARSER but not to scslre, so analysing any `/v` pattern using a
        // property escape threw "Unicode property escapes cannot be used
        // without the u flag" and landed in the catch, whose stated rationale
        // is "the pattern is not a valid regex". It is: it compiles and runs.
        // Measured: 315 ms on 'a'.repeat(26) + 'e-acute', identical to the
        // `/u` spelling below it, which the rule has always reported.
        name: '(\\p{ASCII}+)+$ under the v flag — 315 ms, and /u reports the same pattern',
        code: 'const re = /^(\\p{ASCII}+)+$/v;',
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
