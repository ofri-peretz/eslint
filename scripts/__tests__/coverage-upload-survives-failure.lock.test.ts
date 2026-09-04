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
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';

type Step = {
  name?: string;
  id?: string;
  if?: string;
  run?: string;
  uses?: string;
};

const ROOT = resolve(__dirname, '../..');
const WORKFLOW = join(ROOT, '.github/workflows/codecov.yml');
const doc = parse(readFileSync(WORKFLOW, 'utf-8')) as {
  jobs: Record<string, { steps: Step[] }>;
};
const steps = doc.jobs['coverage'].steps;

/*
 * The EXACT set, name by name, with the EXACT condition each one must carry.
 *
 * An earlier draft counted the steps (`length >= 5`) and matched `/always\(\)/`
 * on the condition. Both were too loose to do the job: deleting a step would
 * have dropped it from the set and left the lock green, and `always() && false`
 * matches that regex while never running. A lock on a condition has to assert
 * the condition.
 *
 * `!cancelled()` rather than `always()`: these steps must survive a package
 * FAILING, but a cancelled run has to actually stop. `always()` keeps
 * uploading after a cancel and publishes whatever partial lcov existed when
 * the run was killed.
 */
const REQUIRED: Record<string, string> = {
  'Locate coverage + JUnit reports': '!cancelled()',
  'Rewrite lcov SF paths to repo-root-relative':
    "!cancelled() && steps.find.outputs.has_lcov == 'true'",
  'Upload per-package coverage flags to Codecov':
    "!cancelled() && steps.find.outputs.has_lcov == 'true'",
  'Upload test results (Test Analytics)':
    "!cancelled() && steps.find.outputs.has_junit == 'true'",
  'Upload coverage artifacts': 'always()',
};

describe('coverage uploads survive one package failing', () => {
  it('no step uploads the same lcov a second time', () => {
    /*
     * A combined `codecov-action` upload used to sit beside the per-package
     * loop. It takes no `files:` input, so it auto-discovered the very lcovs
     * the loop already sends and Codecov held every line twice — 2N lines
     * against N hits wherever the duplicate lost its hit data, which is how
     * secure-coding published 68.54% while measuring 100%.
     *
     * One upload path, not two.
     */
    const uploaders = steps.filter(
      (s) =>
        /codecov-action/.test(String(s.uses ?? '')) ||
        /codecovcli upload-process/.test(String(s.run ?? '')),
    );
    expect(
      uploaders.map((s) => s.name),
      'Exactly one step may send coverage to Codecov. A second one uploads the ' +
        'same files again and doubles every line count.',
    ).toHaveLength(1);
  });

  it('every named data step is still present', () => {
    const present = new Set(steps.map((s) => s.name).filter(Boolean));
    for (const name of Object.keys(REQUIRED)) {
      expect(
        present.has(name),
        `"${name}" is gone from codecov.yml. If it was renamed, rename it here ` +
          'too — a data step that silently leaves this list stops being checked.',
      ).toBe(true);
    }
  });

  it.each(Object.entries(REQUIRED))('%s', (name, expected) => {
    const step = steps.find((s) => s.name === name);
    expect(step, `"${name}" not found`).toBeDefined();
    expect(
      step!.if,
      `"${name}" must be gated on exactly \`${expected}\`. Anything weaker — a ` +
        'missing condition, or one that is never true — means a package missing ' +
        'its threshold uploads nothing for any of the others.',
    ).toBe(expected);
  });

  it('coverage is collected in exactly one place, across every workflow', () => {
    /*
     * Not "the intended runner still exists" — that passes with a second
     * collector sitting beside it. This counts every step in every workflow
     * that turns coverage collection ON, and there must be one.
     *
     * PR shards deliberately pass `--coverage.enabled=false`; those are the
     * negative case and must not count.
     */
    const collectors: string[] = [];
    for (const file of readdirSync(join(ROOT, '.github/workflows'))) {
      if (!/\.ya?ml$/.test(file)) continue;
      const text = readFileSync(join(ROOT, '.github/workflows', file), 'utf-8');
      for (const line of text.split('\n')) {
        if (!/test:coverage|--coverage\.enabled(=|\s+)true/.test(line))
          continue;
        if (/--coverage\.enabled=false/.test(line)) continue;
        if (/^\s*#/.test(line)) continue;
        collectors.push(`${file}: ${line.trim().slice(0, 80)}`);
      }
    }
    expect(
      collectors,
      'Coverage must be collected in exactly one place. A second collector ' +
        'splits the report and revisits the cost decision in #363 by accident.',
    ).toHaveLength(1);
    expect(collectors[0]).toMatch(/^codecov\.yml:/);
    expect(collectors[0]).toContain('--continue');
  });
});
