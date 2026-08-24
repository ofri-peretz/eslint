/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock for two release-workflow intents that are invisible in review and
 * silent when they break.
 *
 * **The "Latest" badge.** Every per-package release passes `--latest=false`,
 * so if the rollup does not claim the badge explicitly, GitHub awards it to
 * whichever release happened to be created last — an arbitrary single package
 * rather than the release that describes the whole thing. Nothing fails when
 * that happens; the repo's front page just points somewhere unhelpful.
 *
 * **The discussion fallback.** `--discussion-category` errors outright when
 * Discussions is disabled or the category is missing. Without the fallback
 * path, turning that variable on would fail a release *after* the packages
 * were already published to npm.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WORKFLOW = join(
  resolve(__dirname, '..', '..'),
  '.github/workflows/release.yml',
);

describe('release.yml — GitHub Release intents', () => {
  let source: string;
  beforeAll(() => {
    source = readFileSync(WORKFLOW, 'utf-8');
  });

  it('per-package releases decline the Latest badge', () => {
    expect(source).toContain('--latest=false');
  });

  it('every rollup release call claims it — not just most of them', () => {
    const rollup = source.slice(
      source.indexOf('Publish rollup GitHub Release'),
    );

    // Counting with a floor is not enough. The block has three call sites
    // (edit, create-with-discussion, create-fallback), so a `>= 2` assertion
    // passes with one silently downgraded — verified by sabotage: the first
    // version of this test went green on a workflow I had deliberately broken.
    //
    // Comments have to go first. The block explains *why* per-package releases
    // pass `--latest=false`, and a naive scan counts that prose as code — the
    // second version of this test failed on a correct workflow for exactly
    // that reason.
    const code = rollup
      .split('\n')
      .filter((line) => !/^\s*#/.test(line))
      .join('\n');

    expect(code).not.toContain('--latest=false');

    const calls = code.match(/gh release (?:create|edit)\b/g)?.length ?? 0;
    const claims = code.match(/--latest\b(?!=)/g)?.length ?? 0;

    expect(calls).toBeGreaterThan(0);
    expect(claims).toBe(calls);
  });

  it('a missing discussion category cannot fail a published release', () => {
    const rollup = source.slice(
      source.indexOf('Publish rollup GitHub Release'),
    );
    expect(rollup).toContain('--discussion-category');
    // The guard: only attempted when set, and a failure warns rather than
    // aborting — the packages are already on npm by this point.
    expect(rollup).toContain('if [ -n "${DISCUSSION_CATEGORY:-}" ]');
    expect(rollup).toContain('::warning::');
    expect(rollup).toMatch(/created=false/);
  });
});
