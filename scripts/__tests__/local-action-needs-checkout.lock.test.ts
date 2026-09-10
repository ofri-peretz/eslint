/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A local action (`uses: ./...`) is read off the WORKSPACE. Without an
 * `actions/checkout` earlier in the same job the workspace is empty, and the
 * step dies with:
 *
 *   Can't find 'action.yml', 'action.yaml' or 'Dockerfile' under
 *   '.../.github/actions/report-failure'.
 *
 * `cron-alerting-shape.lock.test.ts` already asserts the alerting job GRAPH —
 * that whatever can fail is reachable by something declaring a reporter. It
 * reads the workflow as YAML, so a reporter step that is present and correctly
 * wired reads as covered. It cannot see that the step is unable to execute.
 *
 * That gap was not theoretical. `quality-full.yml`'s `quality-full-gate` job
 * declared two reporters — "Report a scheduled failure" and "Report a broken
 * main" — and had no checkout, so both had ALWAYS failed. On 2026-09-10 the
 * #964 merge turned main red at 06:00, `Report a broken main` fired, errored on
 * the missing action, and no issue was opened. main stayed red across three
 * further merges and was found by accident when an unrelated PR rebased onto
 * it — the exact outcome the push trigger was added to prevent.
 *
 * Scanning every workflow, rather than pinning that one job, is deliberate:
 * the defect is invisible on green runs (the step never executes) and only
 * surfaces in the failure path, which is where nobody is looking.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';

const WORKFLOWS = resolve(import.meta.dirname, '..', '..', '.github/workflows');

type Step = { uses?: unknown; name?: unknown };
type Job = { steps?: Step[]; uses?: unknown };

describe('a local action can be resolved by the job that uses it', () => {
  const files = readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'));

  it('finds the workflows', () => expect(files.length).toBeGreaterThan(10));

  it.each(files)('%s', (file) => {
    const doc = parse(readFileSync(join(WORKFLOWS, file), 'utf8')) as {
      jobs?: Record<string, Job>;
    };
    const orphans: string[] = [];

    for (const [id, job] of Object.entries(doc.jobs ?? {})) {
      // A reusable-workflow call has no steps of its own to order.
      if (typeof job.uses === 'string') continue;
      let checkedOut = false;
      for (const step of job.steps ?? []) {
        const uses = typeof step.uses === 'string' ? step.uses : '';
        if (uses.startsWith('actions/checkout')) checkedOut = true;
        else if (uses.startsWith('./') && !checkedOut) {
          orphans.push(`${id} › ${step.name ?? uses} (${uses})`);
        }
      }
    }

    expect(
      orphans,
      `${file}: local action(s) used with no actions/checkout earlier in the ` +
        `same job. The runner reads \`uses: ./...\` off the workspace, so these ` +
        `steps cannot execute — they fail with "Can't find 'action.yml'". Add a ` +
        `checkout as the job's first step.`,
    ).toEqual([]);
  });
});
