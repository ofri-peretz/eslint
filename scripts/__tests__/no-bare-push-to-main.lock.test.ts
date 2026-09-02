/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — no workflow pushes straight at a protected branch.
 *
 * Four scheduled workflows committed their snapshot and ran a bare `git push`.
 * `main` is protected and `enforce_admins` is enabled, so no token is exempt:
 *
 *   remote: error: GH006: Protected branch update failed for refs/heads/main.
 *    ! [remote rejected] main -> main (protected branch hook declined)
 *
 * Each job did its work correctly and threw the result away at the last step —
 * `peer-health` (run 33411140440) and `resource-profile` (run 33502632167) both
 * died exactly there, and filed issues nobody read.
 *
 * The failure mode is why this is a lock rather than a fixed bug. A bare push is
 * invisible in review: it looks like every other automation snippet, it passes
 * every check because no check runs a workflow, and it only fails weeks later on
 * a schedule when nobody is watching. `control-bands.yml` had one too, in a
 * branch that only executes when nothing has breached — it would have started
 * dropping observations silently, which is the exact blindness a control band
 * exists to prevent.
 *
 * Bot changes land through `.github/actions/commit-via-pr`. If a workflow needs
 * to write to `main` some other way, that is a deliberate decision and this lock
 * should be amended with the reason.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const WORKFLOWS = join(REPO_ROOT, '.github/workflows');

/**
 * A push with no explicit refspec goes to the checked-out branch, which in a
 * workflow is whatever was checked out — `main` on a schedule. A push naming
 * `main` is the same thing said out loud.
 */
const BARE_PUSH = /^\s*git push\s*(?:#.*)?$/;
const PUSH_AT_MAIN = /^\s*git push\b.*\borigin\s+(?:HEAD:)?main\b/;

function workflows(): { file: string; lines: string[] }[] {
  return readdirSync(WORKFLOWS)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .sort()
    .map((f) => ({ file: f, lines: readFileSync(join(WORKFLOWS, f), 'utf-8').split('\n') }));
}

const FILES = workflows();

describe('no bare push to a protected branch', () => {
  it('found the workflows it is meant to be checking', () => {
    // Guards the guard: pointed at an empty directory this suite passes happily.
    expect(FILES.length).toBeGreaterThan(20);
  });

  it.each(FILES.map((w) => [w.file, w] as const))('%s pushes through a PR', (file, wf) => {
    const offenders = wf.lines
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => BARE_PUSH.test(line) || PUSH_AT_MAIN.test(line))
      .map(({ n, line }) => `${file}:${n}  ${line.trim()}`);

    expect(
      offenders,
      'A bare `git push` in a workflow targets the checked-out branch — `main` on ' +
        'a schedule — and branch protection declines it with GH006, discarding the ' +
        "job's work at the last step. Use `./.github/actions/commit-via-pr`.",
    ).toEqual([]);
  });

  it('the commit-via-pr action every workflow is pointed at exists', () => {
    const action = join(REPO_ROOT, '.github/actions/commit-via-pr/action.yml');
    const src = readFileSync(action, 'utf-8');
    // The lease read is the part that is easy to lose in a refactor and whose
    // absence only shows up on the SECOND run, once the branch already exists.
    expect(src).toContain('git ls-remote origin "refs/heads/$BRANCH"');
    expect(src).toContain('--force-with-lease="$BRANCH:$LEASE"');
    // Bot commits were running the developer hook chain inside CI.
    expect(src).toContain("LEFTHOOK: '0'");
  });
});
