/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: name-dependence-probe.mts generates RULE_CASES.json when absent.
 *
 * `name-dependence-probe.mts` reads `benchmarks/RULE_CASES.json` on startup.
 * That file is gitignored (135 k lines — see .gitignore) and never present in
 * a fresh CI checkout. Without the auto-generation guard, every scheduled run
 * of `comparison-refresh.yml` crashes with ENOENT in the probe's very first
 * read, `if: failure()` fires, and the issue reporter files a false alarm —
 * issue #803, "Comparison artifact refresh is failing", against a workflow
 * where all the actual refresh steps had completed successfully.
 *
 * The fix: the probe checks for the file and runs `npm run rule-cases` when
 * absent, so it is self-contained whether called from a workflow, a developer's
 * shell, or a test.
 *
 * Sabotage proof:
 *   - Remove the `existsSync` check → "must check whether RULE_CASES.json
 *     exists before reading" fails.
 *   - Remove the `execFileSync` call → "must generate RULE_CASES.json via
 *     npm run rule-cases when absent" fails.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const PROBE_SOURCE = readFileSync(
  resolve(ROOT, 'scripts/name-dependence-probe.mts'),
  'utf-8',
);

describe('name-dependence-probe handles missing RULE_CASES.json', () => {
  it('must check whether RULE_CASES.json exists before reading it', () => {
    expect(
      PROBE_SOURCE,
      'The probe must call fs.existsSync(LEDGER) (or equivalent) before ' +
        'reading the file. Without this check the probe crashes with ENOENT ' +
        'on every CI run where RULE_CASES.json has not been pre-generated, ' +
        'causing comparison-refresh.yml to file a false failure issue (#803).',
    ).toMatch(/existsSync\(LEDGER\)/);
  });

  it('must generate RULE_CASES.json via npm run rule-cases when absent', () => {
    expect(
      PROBE_SOURCE,
      "The probe must call npm run rule-cases (via execFileSync or similar) " +
        "when RULE_CASES.json is absent. Without this the probe crashes with " +
        "ENOENT instead of recovering, and the comparison-refresh workflow " +
        "reports a failure even when all its actual refresh steps succeeded.",
    ).toMatch(/['"]rule-cases['"]/);
  });
});

/**
 * Second prerequisite, found once the first was fixed: the regenerated ledger
 * loads every plugin's rules from dist/, and a fresh CI checkout has no dist/.
 * Run 33717558041 died in the probe on
 * `Cannot find module '@interlace/eslint-devkit/dist/src/index.js'` after all
 * five real refresh steps had succeeded — the same false alarm as #803, one
 * layer down.
 *
 * Sabotage proof: delete the build step, or move it below the probe, and
 * "must build the plugin graph before the probe" fails.
 */
describe('comparison-refresh.yml builds before it probes', () => {
  const WORKFLOW = readFileSync(
    resolve(ROOT, '.github/workflows/comparison-refresh.yml'),
    'utf-8',
  );

  it('must build the plugin graph before the name-dependence probe', () => {
    const build = WORKFLOW.indexOf('npx turbo run build');
    const probe = WORKFLOW.indexOf('scripts/name-dependence-probe.mts');
    expect(
      build,
      'comparison-refresh.yml must run `npx turbo run build` — the probe ' +
        'regenerates RULE_CASES.json from every plugin\'s dist/, which a ' +
        'fresh checkout does not have.',
    ).toBeGreaterThan(-1);
    expect(
      probe,
      'comparison-refresh.yml must still run scripts/name-dependence-probe.mts',
    ).toBeGreaterThan(-1);
    expect(
      build,
      'the build step must come BEFORE the Name-dependence probe step',
    ).toBeLessThan(probe);
  });
});
