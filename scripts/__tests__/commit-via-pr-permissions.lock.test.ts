/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: every workflow that commits through `.github/actions/commit-via-pr`
 * grants `pull-requests: write`.
 *
 * The action pushes a branch and then opens (or updates) a PR from it. With
 * `contents: write` alone the push lands and `gh pr create` fails with
 * "Resource not accessible by integration (createPullRequest)" — which is what
 * comparison-refresh.yml did on 2026-09-03 (run 33718920771): eleven refreshed
 * artifacts on a branch nobody could see, a red run, and #803 re-filed for a
 * workflow whose actual work had succeeded.
 *
 * The check is deliberately coarse (the string must appear anywhere in the
 * file) so it stays true whether the grant lives at workflow or job level.
 *
 * Sabotage proof: delete `pull-requests: write` from comparison-refresh.yml
 * and this fails naming the file.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WORKFLOWS = resolve(__dirname, '..', '..', '.github', 'workflows');

const usingCommitViaPr = readdirSync(WORKFLOWS)
  .filter((f) => f.endsWith('.yml'))
  .map((f) => ({ file: f, text: readFileSync(resolve(WORKFLOWS, f), 'utf-8') }))
  .filter(({ text }) => text.includes('.github/actions/commit-via-pr'));

describe('workflows that commit via PR can open the PR', () => {
  it('finds at least one workflow using commit-via-pr', () => {
    expect(usingCommitViaPr.map((w) => w.file)).not.toHaveLength(0);
  });

  for (const { file, text } of usingCommitViaPr) {
    it(`${file} grants pull-requests: write`, () => {
      expect(
        text,
        `${file} uses .github/actions/commit-via-pr, which runs gh pr create. ` +
          'Without `pull-requests: write` the push succeeds and the PR create ' +
          'fails with "Resource not accessible by integration" (#803).',
      ).toMatch(/^\s*pull-requests:\s*write\b/m);
    });
  }
});
