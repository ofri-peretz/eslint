/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A red release run must not be able to mean "we published".
 *
 * `release.yml` runs `npm publish`, then tags, pushes the tag, and creates a
 * GitHub release. Every step after the publish can fail, and when one does the
 * job goes red with the package already public and unrecallable.
 *
 * That is not hypothetical. Run 33346361671 on 2026-08-31 reported SIX publish
 * jobs as `failure`, and all six versions were on npm — published by the
 * Actions OIDC identity, carrying SLSA provenance. The only evidence a reader
 * had was the job status, and it said the opposite of what happened. It sent
 * this session's investigation the wrong way for hours: the red run was read
 * as "the release never went out", so the real cause of a separate failing
 * check was looked for everywhere except where it was.
 *
 * The fix is ordering, so this test is about ordering: the line that records
 * the publish must come before anything that can fail. A later edit that moves
 * a `git push` or a `gh release create` above the receipt silently restores
 * the defect, and nothing else would notice.
 *
 * See docs/intents/2026-08-31-a-red-release-must-mean-nothing-shipped.md
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const WORKFLOW = readFileSync(
  join(ROOT, '.github', 'workflows', 'release.yml'),
  'utf8',
);

/** Commands that can fail after a publish has already gone out. */
const FAILABLE_AFTER_PUBLISH = [
  'git tag',
  'git push',
  'gh release create',
];

describe('a publish is recorded before anything that can fail', () => {
  it('the workflow still publishes the way this test assumes', () => {
    // If the publish line is renamed or removed, every index below goes to -1
    // and the ordering assertions pass over nothing.
    expect(WORKFLOW).toContain('npm publish --tag "$DIST_TAG"');
    expect(WORKFLOW).toContain('$GITHUB_STEP_SUMMARY');
  });

  it('the receipt sits between the publish and the first failable step', () => {
    const publishedAt = WORKFLOW.indexOf('npm publish --tag "$DIST_TAG"');
    const receiptAt = WORKFLOW.indexOf(
      'PUBLISHED — \\`$PKG_NAME@$PKG_VER\\` is on npm',
    );

    expect(publishedAt, 'the real publish line was not found').toBeGreaterThan(
      -1,
    );
    expect(
      receiptAt,
      'no line records the publish — a failure after this point would leave ' +
        'the run saying nothing shipped while the package is public',
    ).toBeGreaterThan(-1);
    expect(
      receiptAt,
      'the receipt must come AFTER the publish, or it records a publish that ' +
        'has not happened yet',
    ).toBeGreaterThan(publishedAt);

    for (const command of FAILABLE_AFTER_PUBLISH) {
      const commandAt = WORKFLOW.indexOf(command, publishedAt);
      if (commandAt === -1) continue;
      expect(
        commandAt,
        `\`${command}\` runs between the publish and the receipt. If it fails, ` +
          'the job goes red with the package already on npm and nothing on the ' +
          'run page saying so.',
      ).toBeGreaterThan(receiptAt);
    }
  });
});
