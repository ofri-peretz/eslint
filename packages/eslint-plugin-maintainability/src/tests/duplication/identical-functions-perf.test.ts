/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Performance locks for `identical-functions`.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM THE RULE TESTS.
 *
 * This rule was 90.9% of ALL rule time across the ecosystem — 933 ms over 60
 * files (~14.6k lines) against 21.8 ms for the next-slowest rule, growing
 * quadratically because every pair of functions built a full |a|x|b|
 * Levenshtein matrix. Two exact prunes took it to ~30 ms.
 *
 * The prunes are INVISIBLE to the rule's behavioural tests. They only skip
 * work that provably cannot produce a match, so deleting them changes no
 * finding, no message and no percentage — every RuleTester case still passes
 * while the rule silently goes 30x slower again. A green suite would prove
 * nothing, which is exactly the failure this repo writes locks for.
 *
 * So the locks assert the prunes' OBSERVABLE SIGNATURE instead of their
 * timing. `calculateSimilarity` returns exactly 0 when a pair is provably
 * below the threshold; without the prune it would return the true, small,
 * NON-zero ratio. `toBe(0)` therefore fails the moment either prune is
 * removed — deterministically, with no clock involved.
 *
 * Deliberately NOT a timing assertion. This repo runs its suites under heavy
 * parallelism (47 concurrent turbo tasks), where wall-clock thresholds
 * generate flakes rather than signal — and a flaky perf test gets deleted,
 * which loses the protection entirely.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateSimilarity,
  levenshteinDistance,
} from '../../rules/maintainability/identical-functions';

const THRESHOLD = 0.9;

describe('identical-functions performance prunes', () => {
  describe('prune 1 — length ceiling', () => {
    // Levenshtein distance is at least the length difference, so
    // similarity <= shorter.length / longer.length. Under the threshold, the
    // pair cannot match and no matrix should be built.
    it('returns exactly 0 when the length ratio alone rules a match out', () => {
      const short = 'VAR VAR;';
      const long = `VAR VAR = VAR(${'VAR, '.repeat(40)}0);`;

      // Guard the premise: this pair really is decided by length alone.
      expect(short.length / long.length).toBeLessThan(THRESHOLD);

      // Without the prune this is a small POSITIVE ratio, not 0.
      expect(calculateSimilarity(short, long, THRESHOLD)).toBe(0);
    });

    it('is symmetric — argument order must not decide whether it prunes', () => {
      const short = 'VAR VAR;';
      const long = `VAR VAR = VAR(${'VAR, '.repeat(40)}0);`;

      expect(calculateSimilarity(short, long, THRESHOLD)).toBe(
        calculateSimilarity(long, short, THRESHOLD),
      );
    });
  });

  describe('prune 2 — distance budget', () => {
    // Clears the length ceiling, so the DP walk has to start, then bails once
    // a whole row exceeds the largest distance that could still match.
    const a = '{ VAR VAR = VAR.VAR((VAR, VAR) => VAR + VAR.VAR, 0); VAR VAR; }';
    const b = '{ VAR VAR = [VAR, VAR].VAR(Boolean).VAR(VAR).VAR; VAR VAR; }';

    it('reaches the DP walk — the length ceiling must NOT be what rejects it', () => {
      const [longer, shorter] = a.length >= b.length ? [a, b] : [b, a];
      expect(shorter.length / longer.length).toBeGreaterThanOrEqual(THRESHOLD);
    });

    it('returns exactly 0 once the pair blows the distance budget', () => {
      // Without the budget this returns the true ratio — well above 0 and
      // below the threshold. With it, the walk abandons and yields 0.
      expect(calculateSimilarity(a, b, THRESHOLD)).toBe(0);
    });

    it('reports -1 from the distance walk rather than a real distance', () => {
      const [longer, shorter] = a.length >= b.length ? [a, b] : [b, a];
      const budget = Math.floor(longer.length * (1 - THRESHOLD));

      expect(levenshteinDistance(longer, shorter, budget)).toBe(-1);
      // Given an unlimited budget the SAME pair must produce a real distance,
      // proving -1 is the bail-out and not an error path.
      expect(
        levenshteinDistance(longer, shorter, Number.MAX_SAFE_INTEGER),
      ).toBeGreaterThan(budget);
    });
  });

  describe('the prunes must not eat real matches', () => {
    // The other half of the contract. A prune that fired too eagerly would
    // make the rule silently stop reporting duplicates — worse than slow.
    it('identical bodies still score 1', () => {
      const body = '{ VAR VAR = VAR.VAR(VAR); VAR VAR; }';
      expect(calculateSimilarity(body, body, THRESHOLD)).toBe(1);
    });

    it('a near-identical pair still scores at or above the threshold', () => {
      const base = '{ VAR VAR = VAR.VAR(VAR, VAR, VAR, VAR, VAR); VAR VAR; }';
      const near = base.replace('VAR VAR;', 'VAR VARX;');

      const score = calculateSimilarity(base, near, THRESHOLD);
      expect(score).toBeGreaterThanOrEqual(THRESHOLD);
      expect(score).toBeLessThan(1);
    });

    it('the surviving score is the exact unpruned ratio, not an approximation', () => {
      // The percentage reaches users through `{{similarity}}%`, so a pair that
      // survives both prunes must report the same number the original full
      // matrix would have produced.
      const base = '{ VAR VAR = VAR.VAR(VAR, VAR, VAR, VAR, VAR); VAR VAR; }';
      const near = base.replace('VAR VAR;', 'VAR VARX;');

      const [longer, shorter] =
        base.length >= near.length ? [base, near] : [near, base];
      const trueDistance = levenshteinDistance(
        longer,
        shorter,
        Number.MAX_SAFE_INTEGER,
      );
      const expected = (longer.length - trueDistance) / longer.length;

      expect(calculateSimilarity(base, near, THRESHOLD)).toBe(expected);
    });
  });

  describe('the distance budget survives floating point', () => {
    // The budget used to be `floor(L * (1 - t))`. That composed subtraction is
    // lossy: `1 - 0.9 === 0.09999999999999998`, so every length that is a
    // multiple of 10 came out one unit short and the walk abandoned pairs it
    // should have kept. A too-SMALL budget is a false negative — the rule
    // stops reporting a duplicate it used to report — which is why this gets
    // its own group rather than riding along with the prune locks above.
    //
    // Pairs are built by substituting the last `d` characters, so the edit
    // distance is exactly `d` and the similarity is exactly `(L - d) / L`.
    const pairAtDistance = (
      length: number,
      distance: number,
    ): [string, string] => {
      const base = 'V'.repeat(length);
      return [base, 'V'.repeat(length - distance) + 'X'.repeat(distance)];
    };

    it('keeps a pair sitting exactly ON the threshold (L=20, d=2)', () => {
      const [a, b] = pairAtDistance(20, 2);
      // (20 - 2) / 20 === 0.9 === the threshold, so this must be reported.
      // Under the old budget it returned 0 and the duplicate vanished.
      expect(calculateSimilarity(a, b, THRESHOLD)).toBe(0.9);
    });

    it('never under-budgets across lengths and thresholds', () => {
      // A budget is only wrong when it is too small. Walk a spread of lengths
      // and thresholds, put each pair exactly on its threshold, and require it
      // to survive. The old formula fails this at every multiple of 10.
      for (const threshold of [0.5, 0.75, 0.8, 0.9, 0.95]) {
        for (let length = 10; length <= 200; length += 10) {
          const distance = length - Math.ceil(length * threshold);
          if (distance === 0) continue; // identical strings take the fast path
          const [a, b] = pairAtDistance(length, distance);

          const score = calculateSimilarity(a, b, threshold);
          expect(
            score,
            `L=${length} t=${threshold} d=${distance} was pruned away`,
          ).toBeGreaterThanOrEqual(threshold);
        }
      }
    });
  });

  describe('threshold is honoured, not hard-coded', () => {
    // Both prunes are derived from the configured threshold. A refactor that
    // baked in 0.9 would pass every test above and break custom configs.
    const a = '{ VAR VAR = VAR.VAR((VAR, VAR) => VAR + VAR.VAR, 0); VAR VAR; }';
    const b = '{ VAR VAR = [VAR, VAR].VAR(Boolean).VAR(VAR).VAR; VAR VAR; }';

    it('a lenient threshold lets a pair through that 0.9 prunes away', () => {
      expect(calculateSimilarity(a, b, 0.9)).toBe(0);
      expect(calculateSimilarity(a, b, 0.5)).toBeGreaterThan(0);
    });
  });
});
