/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
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
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

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

  it('every excluded fixture really does pass a null option', () => {
    /*
     * SEMANTIC, not textual. An earlier version of this lock only grepped the
     * runner for `function has*Config(` and a nearby `null` token, which would
     * have passed just as happily if the predicate had started excluding
     * fixtures for some other reason entirely.
     *
     * The runner now writes the excluded set into its envelope, so each one
     * can be opened and checked: its inline config must contain an options
     * array with a literal null ELEMENT. A `null` inside a string value does
     * not count, and must not — excluding a fixture that should have been
     * compared inflates the parity rate, which is the only direction this
     * number must never be able to drift.
     */
    const envelopes = readdirSync(RESULTS)
      .filter((f) => f.endsWith('.json'))
      .sort();
    expect(
      envelopes.length,
      'no ILB-Oxlint-Parity envelope to check — run the suite first',
    ).toBeGreaterThan(0);

    const env = JSON.parse(
      readFileSync(join(RESULTS, envelopes[envelopes.length - 1]), 'utf-8'),
    ) as { excludedFixtures?: string[] };
    const excluded = env.excludedFixtures ?? [];
    expect(
      excluded.length,
      'the envelope records no exclusions, so this test would pass vacuously',
    ).toBeGreaterThan(0);

    const INLINE = /\/\*\s*eslint\s+([\s\S]*?)\*\//g;
    const PAIR =
      /([\w@/-]+)\s*:\s*(\[[\s\S]*?\]|"[^"]*"|'[^']*'|\d+)\s*(?:,\s*(?=[\w@/-]+\s*:)|$)/g;

    for (const rel of excluded) {
      const src = readFileSync(join(ROOT, rel), 'utf-8');
      let nulls = false;
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
            nulls = true;
        }
      }
      expect(
        nulls,
        `${rel} is excluded from the parity comparison but its inline config ` +
          'contains no null options slot. Either the predicate has widened or ' +
          'this fixture should be compared.',
      ).toBe(true);
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
