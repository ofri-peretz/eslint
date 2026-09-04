/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * One package failing must not blank the coverage report for all of them.
 *
 * `codecov.yml` is the ONLY place coverage is collected — PR shards run with
 * `--coverage.enabled=false` on purpose. It runs `turbo run test:coverage
 * --continue`, so a package that misses its own 100% threshold still lets
 * every other package finish and write a complete lcov.
 *
 * But the step that FINDS those lcov files had no condition. GitHub skips a
 * step when an earlier one failed, and every upload gates on that step's
 * outputs — so a single failing package uploaded nothing at all, for all 37.
 *
 * Measured before the fix: 8 of the 13 scheduled runs failed, almost every one
 * of them a single type-aware test in nestjs-security timing out at 30s under
 * CI contention. A flaky test in one plugin blanked the coverage report for the
 * whole repository, and the badge kept showing whatever the last green run had
 * left behind — which is how `secure-coding` came to publish 68.54% while
 * measuring 100% locally.
 *
 * The job still fails, and still opens the scheduled-failure issue. What must
 * not happen again is the DATA going down with it.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

type Step = { name?: string; id?: string; if?: string; run?: string };

const WORKFLOW = resolve(__dirname, '../../.github/workflows/codecov.yml');
const doc = parse(readFileSync(WORKFLOW, 'utf-8')) as {
  jobs: Record<string, { steps: Step[] }>;
};
const steps = doc.jobs['coverage'].steps;

/** Steps that move coverage data anywhere. */
const DATA_STEPS = steps.filter((s) =>
  /Locate coverage|Rewrite lcov|Upload combined|Upload per-package|Upload test results|Upload coverage artifacts/.test(
    s.name ?? '',
  ),
);

describe('coverage uploads survive one package failing', () => {
  it('finds the data steps to check', () => {
    // A lock that matches nothing passes forever.
    expect(DATA_STEPS.length).toBeGreaterThanOrEqual(5);
  });

  it.each(DATA_STEPS.map((s) => s.name!))(
    '%s runs even after a failure',
    (name) => {
      const step = DATA_STEPS.find((s) => s.name === name)!;
      expect(
        step.if ?? '',
        `"${name}" has no always() in its condition, so GitHub skips it the moment ` +
          'the test step exits non-zero — and one package missing its threshold ' +
          'uploads nothing for any of them.',
      ).toMatch(/always\(\)/);
    },
  );

  it('still collects coverage in exactly one place', () => {
    // If coverage ever starts being collected on PRs too, the reasoning above
    // (and the cost decision in #363) needs revisiting rather than silently
    // drifting.
    const runner = steps.find((s) =>
      /Run tests with coverage/.test(s.name ?? ''),
    );
    expect(runner?.run).toContain('turbo run test:coverage');
    expect(runner?.run).toContain('--continue');
  });
});
