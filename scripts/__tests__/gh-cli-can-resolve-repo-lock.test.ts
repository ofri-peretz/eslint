/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A job that calls `gh` can tell it which repository to act on.
 *
 * `gh` infers owner/repo from the git remote of the working directory. A job
 * that never checks out has no working directory to infer from, and every
 * invocation dies with `fatal: not a git repository`.
 *
 * `real-source-scan.yml`'s `report` job had neither a checkout nor `-R`. Its
 * entire purpose is to open an issue when the scan fails — so when the scan
 * failed on 2026-09-03, the reporter failed too, and nothing was reported. A
 * broken failure reporter does not announce itself; it is only ever noticed by
 * someone reading run history for another reason.
 *
 * Two ways to satisfy this, and both are fine: check out the repo, or pass the
 * repo explicitly. For a job that only files an issue the second is better —
 * it needs no source tree, and a clone is ~20s of runner time spent on an
 * inference an env var already answers.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WORKFLOWS = resolve(__dirname, '..', '..', '.github/workflows');

type Job = { file: string; id: string; body: string };

function jobsCallingGh(): Job[] {
  const out: Job[] = [];
  for (const file of readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'))) {
    const src = readFileSync(join(WORKFLOWS, file), 'utf8');
    const at = src.indexOf('\njobs:');
    if (at === -1) continue;
    const body = src.slice(at);
    const heads = [...body.matchAll(/^ {2}([A-Za-z0-9_-]+):[ \t]*$/gm)];
    heads.forEach((h, i) => {
      const raw = body.slice(h.index!, heads[i + 1]?.index ?? body.length);
      // Strip comments FIRST. The first version of this check ran against the
      // raw segment, and the comment added beside the fix — which quotes
      // `-R "$GH_REPO"` to explain it — satisfied the very pattern the check
      // looks for. Stripping the flags out of the real commands left the lock
      // green, defeated by its own documentation.
      const seg = raw
        .split('\n')
        .filter((l) => !/^\s*#/.test(l))
        .join('\n');
      // `gh api` takes a full path and never infers, so it is not at risk.
      if (/\bgh (issue|pr|release|run|workflow) /.test(seg))
        out.push({ file, id: h[1], body: seg });
    });
  }
  return out;
}

describe('every job that calls gh can resolve the repository', () => {
  const jobs = jobsCallingGh();

  it('finds jobs that call gh', () => {
    // Guards the assertion below from passing on an empty list if the job or
    // command syntax ever changes shape.
    expect(jobs.length).toBeGreaterThan(0);
  });

  it('each has a checkout or passes the repo explicitly', () => {
    const unresolvable = jobs
      .filter(
        (j) =>
          !j.body.includes('actions/checkout') &&
          !/-R\s|--repo\s|GH_REPO:/.test(j.body),
      )
      .map((j) => `${j.file} job \`${j.id}\``);

    expect(
      unresolvable,
      "gh infers owner/repo from the working directory's git remote; without a " +
        'checkout or an explicit -R every call fails with "fatal: not a git ' +
        'repository" — and in a failure-reporting job that failure is silent',
    ).toEqual([]);
  });
});
