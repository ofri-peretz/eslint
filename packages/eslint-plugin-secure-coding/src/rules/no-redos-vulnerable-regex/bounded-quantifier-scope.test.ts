/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A small bound somewhere in a pattern does not make the whole pattern linear.
 *
 * `isProvablyLinear` is a correction layer: a list of shapes that were TIMED and
 * where scslre's verdict disagreed with the interpreter. It read the FIRST
 * `){n}` in the pattern and, if the bound was <= 5, suppressed the finding.
 *
 * The CVE-2017-18342-class email pattern in `benchmarks/corpus/CWE-1333` has
 * `(@){1}` — a bound of one, on a group that has nothing to do with the
 * vulnerability. The `(...)*` self-loop three groups earlier is the defect, and
 * both independent analysers say so: scslre reports a Self ambiguity, `recheck`
 * returns `vulnerable`. A regex over the pattern TEXT overrode both, which is
 * the defect this rule reports on other people's code.
 *
 * The shortcut now applies only when no group sits under an unbounded
 * quantifier. The shapes it was built for have none, so they are unaffected —
 * the cases below hold both halves.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noRedosVulnerableRegex } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-redos-vulnerable-regex — bounded-quantifier scope', noRedosVulnerableRegex, {
  valid: [
    {
      // The measured shape the shortcut exists for: bounded outer quantifier,
      // no group under * or +. Timed at 0.1ms, scslre reports it anyway.
      name: 'a small bounded quantifier with no unbounded group is still linear',
      code: `export const re = /^(a+){1,3}$/;`,
    },
    {
      name: 'a bound of one with no unbounded group',
      code: `export const re = /^(@){1}[a-z]+$/;`,
    },
  ],
  invalid: [
    {
      // The CVE pattern's shape, reduced: a self-loop group under `*`, plus an
      // unrelated `){1}` later. The bound must not suppress the self-loop.
      name: 'a self-loop under * is not excused by a later bound of one',
      code: `export const re = /^(([a-z]+)*)(@){1}[a-z]+$/;`,
      errors: 1,
    },
    {
      // Same, with the bound BEFORE the self-loop, since the old check took
      // whichever `){n}` came first.
      name: 'a self-loop is not excused by an earlier bound either',
      code: `export const re = /^(@){1}(([a-z]+)*)$/;`,
      errors: 1,
    },
  ],
});
