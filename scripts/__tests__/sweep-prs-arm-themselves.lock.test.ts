/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Every Routine that opens a sweep PR gets that PR armed for auto-merge.
 *
 * #829 moved the issue sweep's schedule to a Routine and had `issue-sweep.yml`
 * arm the PR, on the principle that arming is a repository action rather than a
 * tool the model holds. The condition it shipped was an exact match on
 * `chore/issue-sweep`.
 *
 * A second Routine — the burgee FP/FN sweep — opens
 * `chore/fp-fn-sweep-<UTC-timestamp>`, a fresh branch per run. Those never
 * matched, so every one of its PRs had to be armed by hand, and any that nobody
 * armed sat green and unmerged. That is the same backlog this workflow exists
 * to drain, one level up.
 *
 * @provenBy {"file": ".github/workflows/issue-sweep.yml", "find": "      (github.head_ref == 'chore/issue-sweep' ||\n      startsWith(github.head_ref, 'chore/fp-fn-sweep-'))", "replace": "      github.head_ref == 'chore/issue-sweep'"}
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const WORKFLOW = fs.readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../.github/workflows/issue-sweep.yml',
  ),
  'utf-8',
);

describe('a Routine-opened sweep PR arms itself', () => {
  it('arms the issue sweep', () => {
    expect(WORKFLOW).toContain("github.head_ref == 'chore/issue-sweep'");
  });

  it('arms the burgee FP/FN sweep, whose branch carries a per-run timestamp', () => {
    // A prefix match, not equality — the branch is
    // `chore/fp-fn-sweep-<UTC-timestamp>` so that two sweeps cannot collide.
    expect(WORKFLOW).toContain(
      "startsWith(github.head_ref, 'chore/fp-fn-sweep-')",
    );
  });

  it('still arms with --auto and never --admin', () => {
    expect(WORKFLOW).toContain('--squash --auto --delete-branch');
    // The safety notes at the top of the file say the word `--admin`, so the
    // assertion has to look at what is EXECUTED, not at prose about it.
    const commands = WORKFLOW.split('\n').filter(
      (line) =>
        line.includes('gh pr merge') && !line.trimStart().startsWith('#'),
    );
    expect(commands.length).toBeGreaterThan(0);
    for (const line of commands) expect(line).not.toContain('--admin');
  });
});
