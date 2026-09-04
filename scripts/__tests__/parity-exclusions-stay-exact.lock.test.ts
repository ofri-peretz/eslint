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
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const SUITE = join(ROOT, 'benchmarks/suites/ilb-oxlint-parity');

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

  it('exactly one exclusion predicate exists, and it tests for null options', () => {
    const src = readFileSync(join(SUITE, 'run.ts'), 'utf-8');

    // One predicate, named, so a second one cannot appear unnoticed.
    const predicates = [...src.matchAll(/^function has\w*Config\(/gm)];
    expect(
      predicates.map((m) => m[0]),
      'More than one fixture-exclusion predicate now exists in the parity ' +
        'runner. Every additional one narrows what the parity rate looked at.',
    ).toHaveLength(1);

    expect(src).toContain('function hasNullOptionConfig(');
    // It must key on a null inside an options array, not on a rule or a path.
    expect(
      /hasNullOptionConfig[\s\S]{0,900}?\\bnull\\b/.test(src),
      'hasNullOptionConfig no longer tests for a null options slot.',
    ).toBe(true);
  });

  it('the exclusion is applied to BOTH linters', () => {
    const src = readFileSync(join(SUITE, 'run.ts'), 'utf-8');
    /*
     * Dropping the fixtures from one side only would move the parity rate in
     * that linter's favour while looking like a tidy-up.
     */
    // The definition is an arrow (`const dropNullOptionFixtures = (findings)`)
    // so it does not match `name(`; these are the CALL sites, one per linter.
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
