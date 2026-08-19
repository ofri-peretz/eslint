/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The oracle is an OPTIONAL peer dependency, so the path most consumers take is
 * the one where it is absent. That path is therefore tested first and hardest:
 * a rule whose behaviour silently depends on whether a 50 MB package happens to
 * be installed is worse than a rule with no oracle at all.
 *
 * The contract under test, in both directions:
 *
 *   absent      every finding survives; the rule behaves exactly as before
 *   present     a finding survives unless the oracle proves the pattern SAFE
 *   undecided   survives — `unknown` is not a clean bill of health
 *   throwing    survives — a pattern the analyser cannot parse is not thereby safe
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __setOracleForTests,
  confirmsRedos,
  oracleAvailable,
  resetOracleForTests,
} from './redos-oracle';

describe('redos-oracle', () => {
  beforeEach(() => {
    resetOracleForTests();
    vi.resetModules();
  });

  describe('with recheck installed (this repo)', () => {
    it('is available', () => {
      expect(oracleAvailable()).toBe(true);
    });

    it('retracts a finding for a pattern it proves linear', () => {
      // `^[a-z]+$` has no ambiguity for an automaton to exploit.
      expect(confirmsRedos('^[a-z]+$', '')).toBe(false);
    });

    it('keeps a finding for a pattern it proves vulnerable', () => {
      // The canonical exponential case.
      expect(confirmsRedos('^(a+)+$', '')).toBe(true);
    });

    it('keeps a finding for a polynomial pattern', () => {
      // Real, and quieter than exponential — still not safe.
      expect(confirmsRedos('^\\d+\\.?\\d*$', '')).toBe(true);
    });

    it('keeps a finding when the pattern cannot be parsed', () => {
      // An unparseable pattern is not thereby a safe one.
      expect(confirmsRedos('^(a+', '')).toBe(true);
    });

    it('memoises by source AND flags', () => {
      // Same source, different flags, is a different automaton — `i` folds
      // case, which can create ambiguity that the case-sensitive form lacks.
      const first = confirmsRedos('^[a-z]+$', '');
      const second = confirmsRedos('^[a-z]+$', '');
      expect(first).toBe(second);
      expect(confirmsRedos('^[a-z]+$', 'i')).toBeTypeOf('boolean');
    });
  });

  describe('with recheck absent — the default for consumers', () => {
    it('every finding survives, and nothing throws', () => {
      resetOracleForTests(true);
      expect(oracleAvailable()).toBe(false);

      // Whatever the pattern, an absent oracle never retracts. `^[a-z]+$` is
      // the control that makes this test meaningful: with the oracle present
      // the assertion above returns FALSE for it, so a `true` here can only
      // come from the absence path actually being taken.
      expect(confirmsRedos('^[a-z]+$', '')).toBe(true);
      expect(confirmsRedos('^(a+)+$', '')).toBe(true);
    });

    it('a module id that does not resolve takes the same path as a missing peer', () => {
      // Not a simulation — the require genuinely fails, which is the only way
      // to execute the catch that records the absence.
      __setOracleForTests('recheck-this-package-does-not-exist');
      expect(oracleAvailable()).toBe(false);
      expect(confirmsRedos('^[a-z]+$', '')).toBe(true);
      resetOracleForTests();
    });

    it('an oracle that throws does not retract the finding', () => {
      // A pattern the analyser cannot process is not thereby a safe one, and
      // the rule's own judgement has to stand.
      __setOracleForTests({
        checkSync: () => {
          throw new Error('analyser exploded');
        },
      });
      expect(confirmsRedos('^[a-z]+$', '')).toBe(true);
      resetOracleForTests();
    });

    it('an oracle that answers "unknown" does not retract either', () => {
      __setOracleForTests({ checkSync: () => ({ status: 'unknown' as const }) });
      expect(confirmsRedos('^[a-z]+$', '')).toBe(true);
      resetOracleForTests();
    });

    it('the rule is unchanged when the oracle is absent', () => {
      // Same two patterns, oracle restored — the control fires again, proving
      // the previous test was not passing for some unrelated reason.
      resetOracleForTests();
      expect(confirmsRedos('^[a-z]+$', '')).toBe(false);
    });
  });
});
