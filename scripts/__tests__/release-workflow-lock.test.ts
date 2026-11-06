/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock for the release workflow's GitHub Release shape (docs/adr/0009).
 *
 * **Per-package releases only.** Each published package gets one
 * `<name>@<version>` release. There is no cross-package `release-<date>-<sha>`
 * rollup release; one coming back would put a second "Latest" claimant on the
 * releases page.
 *
 * **The "Latest" badge.** The publish matrix runs in parallel, so every
 * per-package `gh release create` passes `--latest=false`; otherwise the badge
 * lands on whichever job finished last. The summarize job then gives it, once,
 * to the newest release this run created. Nothing fails when either half
 * breaks; the repo's front page just points somewhere unhelpful.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WORKFLOW = join(
  resolve(__dirname, '..', '..'),
  '.github/workflows/release.yml',
);

const LATEST_STEP = 'Mark the newest package release Latest';

function stripComments(block: string): string {
  return block
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');
}

function stepBody(source: string, name: string): string {
  const start = source.indexOf(`- name: ${name}`);
  const next = source.indexOf('- name:', start + 1);
  return source.slice(start, next === -1 ? undefined : next);
}

describe('release.yml — GitHub Release shape', () => {
  let code: string;
  beforeAll(() => {
    code = stripComments(readFileSync(WORKFLOW, 'utf-8'));
  });

  it('creates no cross-package rollup release', () => {
    expect(code).not.toMatch(/release-\$\(git log/);
    expect(code).not.toContain('rollup-notes.md');
    expect(code).not.toContain('--discussion-category');
  });

  it('every per-package release create declines the badge', () => {
    const publish = stepBody(code, 'Create GitHub Release');
    const creates = publish.match(/gh release create\b/g)?.length ?? 0;
    const declines = publish.match(/--latest=false\b/g)?.length ?? 0;
    expect(creates).toBeGreaterThan(0);
    expect(declines).toBe(creates);
  });

  it('the summarize job hands the badge to one of this run’s package releases', () => {
    const step = stepBody(code, LATEST_STEP);
    expect(step).toContain(LATEST_STEP);
    expect(step).toMatch(/gh release edit "\$newest" --latest(?!=)/);
    expect(step).toContain('max_by(.createdAt)');
    expect(step).toContain('needs.detect.outputs.matrix');
  });

  it('only a latest-dist-tag, non-dry-run release moves the badge', () => {
    const step = stepBody(code, LATEST_STEP);
    expect(step).toContain('!inputs.dry-run');
    expect(step).toContain("(inputs.dist-tag || 'latest') == 'latest'");
  });
});
