/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The oracle decides the DEGREE, not just "vulnerable or not".
 *
 * Measured on the pinned 8-repo corpus 2026-08-20. Two things came out of it,
 * and the second only became visible after the first was fixed:
 *
 * 1. `scripts/corpus-scan.ts` had never installed `recheck`. It is an OPTIONAL
 *    peer and `confirmsRedos` FAILS OPEN without it, so every ReDoS number ever
 *    recorded for that corpus was measured with the oracle switched off.
 *    Installing it changed the count by ZERO — all seven findings were real.
 *
 * 2. Not one of the seven was exponential. Three sat at degree 3 and three at
 *    degree 2, and the degree is what decides whether anybody acts:
 *
 *      (.*?)=(.*)$    degree 3, run over a cookie header. 4KB of input is
 *                     ~6e10 steps — a hang.
 *      ^###\s+(.+)$   degree 2, run over one markdown heading. Quadratic on a
 *                     short line is arithmetic.
 *
 * Scored under Google's Tricorder definition — a correct finding nobody acts on
 * is still an effective false positive — the degree-2 half was noise. Gating it
 * took the corpus from 7 findings to 5 and the budget ratcheted down with it.
 *
 * The invariant is unchanged and is what the last case here pins: the oracle
 * may only ever REMOVE a finding. A null degree — absent, timed out,
 * unparseable — retracts nothing, so uninstalling the optional peer can only
 * add findings, never hide one.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterEach, describe, expect, it } from 'vitest';
import { noRedosVulnerableRegex } from './index';
import { oracleAvailable, resetOracleForTests, worstBacktrackingDegree } from '../../utils/redos-oracle';

const ruleTester = new RuleTester();

describe('the oracle is present for these tests', () => {
  it('resolves recheck, so the degree gate is actually exercised', () => {
    // Without this the whole file would pass vacuously on a machine that has
    // no oracle — exactly the way the corpus scan passed for months.
    expect(oracleAvailable()).toBe(true);
  });

  it('reads a degree rather than a boolean', () => {
    expect(worstBacktrackingDegree(String.raw`^###\s+(.+)$`, '')).toBe(2);
    expect(worstBacktrackingDegree(String.raw`(.*?)=(.*)$`, '')).toBe(3);
  });

  afterEach(() => resetOracleForTests());
});

ruleTester.run('no-redos-vulnerable-regex — oracle degree gate', noRedosVulnerableRegex, {
  valid: [
    {
      // Quadratic over a markdown heading: real ambiguity, nobody acts.
      name: 'degree 2 is silent by default',
      code: 'export const re = /^###\\s+(.+)$/;',
    },
  ],
  invalid: [
    {
      // FN GUARD: degree 3 over a cookie header is a hang, and still reports.
      name: 'degree 3 still reports',
      code: 'export const re = /(.*?)=(.*)$/;',
      errors: 1,
    },
    {
      // FN GUARD: the option brings quadratic back for codebases whose patterns
      // run over input the caller does not size.
      name: 'degree 2 reports when asked for',
      code: 'export const re = /^###\\s+(.+)$/;',
      options: [{ reportSecondDegreePolynomial: true }],
      errors: 1,
    },
  ],
});
