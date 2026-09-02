/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every scheduled workflow can actually reach a human when it fails.
 *
 * On 2026-09-01, 7 of 15 scheduled workflows were failing and only 3 had filed
 * an issue. The other four were not missing alerting — three of them declared
 * it — they were failing in shapes their alerting could not see:
 *
 *   benchmark              7 jobs, no reporting anywhere
 *   eslint-version-matrix  report inside a `fail-fast: true` matrix, where a
 *                          cancelled sibling makes `failure()` false
 *   oxlint-parity          report only in `deep-parity`; `runtime-and-parity`
 *                          was the job that broke
 *   integration-health     `if:` read `inputs.*`, which is empty on schedule
 *
 * A scan asking "does this file mention report-failure" passes three of those
 * four. That is worse than no check, because it reads as coverage. So this
 * asserts the job GRAPH instead: whatever can fail must be reachable by
 * something that reports.
 *
 * See docs/intents/cron-failure-delivery/.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parse } from 'yaml';

const ROOT = resolve(__dirname, '..', '..');
const WORKFLOWS = resolve(ROOT, '.github/workflows');
const debt = (
  JSON.parse(
    readFileSync(resolve(ROOT, '.github/cron-alerting-debt.json'), 'utf8'),
  ) as { uncovered: Record<string, string[]> }
).uncovered;

type Step = Record<string, unknown>;
type Job = { steps?: Step[]; needs?: string | string[]; if?: string };

const reports = (j: Job) =>
  (j.steps ?? []).some(
    (s) =>
      (typeof s.uses === 'string' && s.uses.includes('report-failure')) ||
      (typeof s.name === 'string' && s.name.includes('🚨')),
  );

const needsOf = (j: Job) =>
  Array.isArray(j.needs) ? j.needs : j.needs ? [j.needs] : [];

/** Does this condition still evaluate when an upstream job failed? */
const survivesFailure = (cond: string) =>
  /always\(\)|failure\(\)|needs\.\*\.result/.test(cond);

describe('a scheduled workflow can reach a human when it fails', () => {
  const files = readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'));

  it.each(files)('%s', (file) => {
    const raw = readFileSync(join(WORKFLOWS, file), 'utf8');
    const doc = parse(raw) as { on?: unknown; true?: unknown; jobs?: Record<string, Job> };
    const triggers = (doc.on ?? doc.true) as Record<string, unknown> | undefined;
    if (!triggers || !Array.isArray(triggers.schedule)) return;

    const jobs = doc.jobs ?? {};

    // An explicit, reviewable opt-out. Silence should be a decision with a
    // reason attached, not something achieved by leaving a step out.
    if (/#\s*alerting:\s*none/i.test(raw)) return;

    const reporters = Object.entries(jobs).filter(([, j]) => reports(j));

    // A RATCHET, not a clean bill of health.
    //
    // Nine jobs across eight workflows are uncovered today, recorded in
    // `.github/cron-alerting-debt.json`. Several are single-job crons that
    // file *finding* issues (their purpose) but have no *failure* reporter —
    // a distinction worth keeping, and one that needs a judgement per
    // workflow rather than a blanket edit. Paying that down is tracked in
    // docs/intents/cron-failure-delivery.
    //
    // What this refuses is GROWTH: a new scheduled job that nobody reports.
    // Asserting zero today would mean either a red suite or deleting the
    // finding, and both end with the debt invisible again.
    const allowed = new Set(debt[file] ?? []);

    const uncovered = Object.entries(jobs)
      .filter(([, job]) => !reports(job))
      .filter(
        ([id]) =>
          !reporters.some(
            ([, r]) =>
              needsOf(r).includes(id) && survivesFailure(String(r.if ?? '')),
          ),
      )
      .map(([id]) => id);

    const added = uncovered.filter((id) => !allowed.has(id));
    expect(
      added,
      `${file}: job(s) ${added.join(', ')} can fail with nobody reporting it. ` +
        `A reporter must list the job in \`needs\` and run on failure ` +
        `(always() / failure() / contains(needs.*.result, 'failure')) — a ` +
        `reporter inside another job, or one that omits this job, does not ` +
        `see it. If the silence is deliberate, say so with ` +
        `"# alerting: none — <reason>".`,
    ).toEqual([]);

    // Debt that is paid must be removed from the baseline, or the ratchet
    // quietly stops ratcheting.
    const stale = [...allowed].filter((id) => !uncovered.includes(id));
    expect(
      stale,
      `${file}: ${stale.join(', ')} are listed in cron-alerting-debt.json but ` +
        `are now covered. Remove them so the baseline keeps meaning what it says.`,
    ).toEqual([]);
  });
});
