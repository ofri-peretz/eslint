/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock: both `gh pr merge --auto` steps in `issue-sweep.yml` authenticate
 * with a real actor, not the bare default token.
 *
 * GitHub does not fire new workflow runs for git/API operations
 * authenticated as `GITHUB_TOKEN` — `changesets-pr.yml` already carries the
 * writeup for this exact restriction biting the Version PR's own push
 * (measured on #600: 0 checks, ever). It recurred here in a different bot
 * action: the `arm` job and the `sweep` job's own auto-merge step both armed
 * `gh pr merge --auto` with `GH_TOKEN: ${{ github.token }}`. When two sweep
 * PRs (#1039, #1040) were auto-merged that way on 2026-09-14, the resulting
 * squash-merge pushes triggered ZERO workflows repo-wide — not Changesets,
 * not Quality, not CodeQL. A changeset landed on main with no Version
 * Packages PR ever opened for it, which silently stalled the release
 * pipeline (#1041).
 *
 * The fix is the same PAT-fallback chain `changesets-pr.yml` already uses:
 * `secrets.RELEASE_BOT_PAT || secrets.AGENTS_REPO_PAT || github.token`. A PAT
 * is a person rather than the bot, so its pushes trigger CI normally; the
 * `||` chain keeps `github.token` last, so behaviour is never worse than
 * today when no PAT is configured.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/issue-sweep-auto-merge-token-lock.test.ts
 *
 * @provenBy {"file": ".github/workflows/issue-sweep.yml", "find": "GH_TOKEN: ${{ secrets.RELEASE_BOT_PAT || secrets.AGENTS_REPO_PAT || github.token }}\n          REPO: ${{ github.repository }}\n          PR: ${{ github.event.pull_request.number }}", "replace": "GH_TOKEN: ${{ github.token }}\n          REPO: ${{ github.repository }}\n          PR: ${{ github.event.pull_request.number }}"}
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW = join(ROOT, '.github', 'workflows', 'issue-sweep.yml');

const PAT_FALLBACK_CHAIN =
  '${{ secrets.RELEASE_BOT_PAT || secrets.AGENTS_REPO_PAT || github.token }}';

/** Every step whose `run:` block calls `gh pr merge ... --auto`. */
function autoMergeSteps(workflow: string): string[] {
  const steps = workflow.split(/\n(?=      - name:)/);
  return steps.filter((s) => /gh pr merge .*--auto\b/.test(s));
}

describe('issue-sweep.yml auto-merge token wiring', () => {
  const workflow = readFileSync(WORKFLOW, 'utf8');
  const steps = autoMergeSteps(workflow);

  it('finds both auto-merge steps this lock is guarding', () => {
    // If this count changes, a step was added, removed or renamed — update
    // the lock deliberately rather than have it silently cover fewer steps.
    expect(steps).toHaveLength(2);
  });

  it('every gh pr merge --auto step authenticates with the PAT-fallback chain, never the bare default token', () => {
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      const ghToken = /^\s+GH_TOKEN:\s*(.+)$/m.exec(step);
      expect(
        ghToken?.[1]?.trim(),
        `step missing a GH_TOKEN env var:\n${step}`,
      ).toBe(PAT_FALLBACK_CHAIN);
    }
  });
});
