/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 *
 * @provenBy {"file":"benchmarks/suites/ilb-oxlint-parity/run.ts","find":"dropNullOptionFixtures(oxlintFindings)","replace":"oxlintFindings"}
 */

/**
 * The parity suite excludes exactly one class of fixture, and no more.
 *
 * ILB-Oxlint-Parity reports 100% with an EMPTY allowlist. That number is only
 * worth anything while the one exclusion it does make stays narrow, so this
 * pins both halves:
 *
 *   the allowlist is empty  — no rule is excused for behaving differently
 *   the exclusion is exact  — only fixtures whose inline config passes a
 *                             literal `null` options slot
 *
 * The excluded fixtures come from `options: [null]` synthetic-branch tests,
 * which exercise a rule's `options || {}` fallback. ESLint accepts the null
 * through its inline path — its own config validator rejects the same value
 * (`Value null should be object`) — and oxlint's schema refuses it. The two
 * linters are being asked different questions there, so the comparison says
 * nothing about whether the rule works under oxlint.
 *
 * A parity rate is easy to inflate by widening what it declines to look at.
 * This is the guard against doing that quietly.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const SUITE = join(ROOT, 'benchmarks/suites/ilb-oxlint-parity');
const RESULTS = join(ROOT, 'benchmarks/results/ilb-oxlint-parity');

describe('parity exclusions stay exact', () => {
  it('the allowlist is empty — no rule is excused', () => {
    const allow = JSON.parse(
      readFileSync(join(SUITE, 'allowlist.json'), 'utf-8'),
    ) as { eslintOnly: unknown[]; oxlintOnly: unknown[] };
    expect(
      allow.eslintOnly,
      'A rule has been excused for diverging under oxlint. That may be right — ' +
        'multi-module rules genuinely cannot reach the same verdict in a ' +
        'per-file runtime — but it must be argued in the PR, not absorbed by ' +
        'this lock.',
    ).toEqual([]);
    expect(allow.oxlintOnly).toEqual([]);
  });

  it('the excludable set is exactly the fixtures with a null options slot', () => {
    /*
     * SELF-CONTAINED, and semantic.
     *
     * Two earlier shapes of this test were wrong in opposite ways. The first
     * grepped the runner for `function has*Config(` and a nearby `null`
     * token — it would have passed just as happily if the predicate had
     * started excluding fixtures for some other reason. The second read the
     * excluded set out of the run envelope, which CI does not regenerate, so
     * it picked up a months-old envelope with no `excludedFixtures` key and
     * failed for a reason that had nothing to do with the invariant.
     *
     * So derive the set here, from the corpus, the same way the runner must:
     * a fixture is excludable exactly when its inline config carries an
     * options array with a literal null ELEMENT. A `null` inside a string
     * value does not count and must not — excluding a fixture that should
     * have been compared inflates the parity rate, which is the only
     * direction this number must never be able to drift.
     *
     * When an envelope from a fresh run IS present, its excluded set must
     * equal this one. That is the cross-check; its absence is not a failure.
     */
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, e.name);
        if (e.isDirectory()) out.push(...walk(full));
        else if (/\.(js|jsx|mjs|cjs|ts|tsx|mts|cts)$/.test(e.name))
          out.push(full);
      }
      return out;
    };

    const INLINE = /\/\*\s*eslint\s+([\s\S]*?)\*\//g;
    const PAIR =
      /([\w@/-]+)\s*:\s*(\[[\s\S]*?\]|"[^"]*"|'[^']*'|\d+)\s*(?:,\s*(?=[\w@/-]+\s*:)|$)/g;

    const hasNullOption = (file: string): boolean => {
      const src = readFileSync(file, 'utf-8');
      for (const block of src.matchAll(INLINE)) {
        for (const [, , raw] of block[1].matchAll(PAIR)) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(raw);
          } catch {
            try {
              parsed = JSON.parse(raw.replace(/'/g, '"'));
            } catch {
              continue;
            }
          }
          if (Array.isArray(parsed) && parsed.some((v) => v === null))
            return true;
        }
      }
      return false;
    };

    const corpus = join(ROOT, 'benchmarks/corpus');
    const excludable = walk(corpus)
      .filter(hasNullOption)
      .map((f) =>
        f
          .slice(ROOT.length + 1)
          .split(sep)
          .join('/'),
      )
      .sort();

    expect(
      excludable.length,
      'no fixture carries a null options slot, so this test would pass ' +
        'vacuously — and the runner should then be excluding nothing.',
    ).toBeGreaterThan(0);

    // Every excludable fixture is a real corpus file with a real null slot.
    for (const rel of excludable) {
      expect(hasNullOption(join(ROOT, rel))).toBe(true);
    }

    // Cross-check against a fresh envelope, when one is present.
    const envelopes = existsSync(RESULTS)
      ? readdirSync(RESULTS)
          .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
          .sort()
      : [];
    for (const name of envelopes) {
      const env = JSON.parse(readFileSync(join(RESULTS, name), 'utf-8')) as {
        excludedFixtures?: string[];
      };
      if (env.excludedFixtures === undefined) continue; // pre-dates the field
      expect(
        [...env.excludedFixtures].sort(),
        `${name} excluded a different set than the corpus says is excludable. ` +
          'Either the predicate widened or a fixture changed.',
      ).toEqual(excludable);
    }
  });

  it('the exclusion is applied to BOTH linters', () => {
    const src = readFileSync(join(SUITE, 'run.ts'), 'utf-8');
    /*
     * Dropping the fixtures from one side only would move the parity rate in
     * that linter's favour while looking like a tidy-up.
     */
    expect(src).toContain('const dropNullOptionFixtures =');
    const calls = [...src.matchAll(/dropNullOptionFixtures\(/g)];
    expect(
      calls.length,
      'dropNullOptionFixtures must wrap BOTH finding sets — one call per ' +
        'linter, so the exclusion cannot favour either side.',
    ).toBe(2);
    expect(src).toMatch(
      /diff\(\s*dropNullOptionFixtures\(eslintFindings\),\s*dropNullOptionFixtures\(oxlintFindings\),?\s*\)/,
    );
  });
});
