/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A package must write its coverage where the uploader looks for it.
 *
 * `.github/workflows/codecov.yml` finds reports with
 *
 *     find packages -path (star)/coverage/lcov.info
 *     for lcov in packages/(star)/coverage/lcov.info
 *
 * written with (star) because the literal glob would close this comment.
 *
 * so a package whose `reportsDirectory` points anywhere else produces a
 * perfectly good lcov that is never uploaded.
 *
 * `eslint-plugin-node-security` did exactly that. It wrote to
 * `../../coverage/packages/eslint-plugin-node-security` — the repo root — and
 * its coverage had never reached Codecov. The path arrived in a "chore:
 * organize repo" commit rather than a decision.
 *
 * What made it survive is the reporting model: every flag in `codecov.yml` sets
 * `carryforward: true`, so when a flag stops reporting Codecov keeps showing
 * the last value it ever received. node-security sat at a plausible 99.80% —
 * close enough to the 100% it actually measures that nothing looked wrong —
 * while the number had simply stopped moving. A silent, believable, permanently
 * stale figure is worse than a missing one.
 *
 * Two things have to agree, so both are asserted here: the directory each
 * package writes to, and the glob the workflow reads from.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const PACKAGES = join(ROOT, 'packages');

/** Every package that declares a vitest config. */
function configs(): { pkg: string; file: string; text: string }[] {
  const out: { pkg: string; file: string; text: string }[] = [];
  for (const pkg of readdirSync(PACKAGES)) {
    for (const name of ['vitest.config.mts', 'vitest.config.ts']) {
      const file = join(PACKAGES, pkg, name);
      if (existsSync(file))
        out.push({ pkg, file, text: readFileSync(file, 'utf-8') });
    }
  }
  return out;
}

const CONFIGS = configs();

describe('coverage lands where the uploader looks', () => {
  it('finds package configs to check', () => {
    // Guard against the glob silently matching nothing.
    expect(CONFIGS.length).toBeGreaterThan(20);
  });

  it.each(CONFIGS.map((c) => c.pkg))(
    '%s writes into its own coverage/',
    (pkg) => {
      const { text } = CONFIGS.find((c) => c.pkg === pkg)!;
      const declared = /reportsDirectory:\s*'([^']+)'/.exec(text)?.[1];

      // Not declaring one is fine — vitest defaults to ./coverage, which is
      // exactly where the uploader looks.
      if (declared === undefined) return;

      expect(
        declared,
        `${pkg} writes coverage to "${declared}". The upload workflow only reads ` +
          "packages/*/coverage/lcov.info, so this package's coverage would never " +
          'reach Codecov — and with carryforward on, its badge would keep showing ' +
          'a stale number instead of going blank.',
      ).toMatch(/^\.\/coverage$|^coverage$/);
    },
  );

  it('the workflow still reads from packages/*/coverage', () => {
    // If the workflow's glob moves, the assertion above is pinning the wrong
    // location and would pass while every package became invisible.
    const wf = readFileSync(
      join(ROOT, '.github/workflows/codecov.yml'),
      'utf-8',
    );
    expect(wf).toContain("find packages -path '*/coverage/lcov.info'");
    expect(wf).toContain('for lcov in packages/*/coverage/lcov.info');
  });
});
