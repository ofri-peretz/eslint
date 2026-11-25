/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */
/**
 * Lock: the oxlint alias drift check runs on a PR that is opened and never
 * pushed to again.
 *
 * What was wrong on main (2026-11-25): `oxlint-parity.yml` listed
 * `pull_request.types: [ready_for_review, labeled, synchronize]`. Setting
 * `types` replaces GitHub's default (opened, synchronize, reopened), so #1753
 * (the sweep's oxlint 1.90.0 -> 1.94.0 bump, non-draft, package.json +
 * package-lock.json changed) was opened, got no `Oxlint Parity Gate` run, and
 * merged. 31 `packages/oxlint-plugin-*` READMEs drifted on main and release
 * #1738 failed. The check existed; it was never scheduled.
 *
 * #1760 shipped the workflow change (`opened`, `reopened`, `package-lock.json`);
 * this lock is the check that would have caught it, so it cannot silently
 * regress.
 *
 * Sabotage proof: dropping `opened` from `types`, or `package-lock.json` from
 * `paths`, fails the cases below.
 *
 * @provenBy {"file":".github/workflows/oxlint-parity.yml","find":"types: [opened, reopened, ready_for_review, labeled, synchronize]","replace":"types: [ready_for_review, labeled, synchronize]"}
 * @provenBy {"file":".github/workflows/oxlint-parity.yml","find":"      - 'package-lock.json'\n","replace":""}
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';

const ROOT = resolve(__dirname, '..', '..');
const wf = parse(
  readFileSync(join(ROOT, '.github/workflows/oxlint-parity.yml'), 'utf-8'),
);
const pr = wf.on.pull_request as { types: string[]; paths: string[] };
const staticAudit = wf.jobs['static-audit'];

/** Would GitHub schedule this workflow for the PR event? (exact-path filters only) */
const schedules = (action: string, changed: string[]) =>
  pr.types.includes(action) && changed.some((f) => pr.paths.includes(f));

describe('oxlint-parity schedules the alias drift check on dependency bumps', () => {
  // #1753: opened by the sweep, non-draft, never pushed to again.
  const bump = ['package.json', 'package-lock.json'];

  it('runs when a PR is opened', () => {
    expect(schedules('opened', bump)).toBe(true);
  });

  it('runs when a closed PR is reopened', () => {
    expect(schedules('reopened', bump)).toBe(true);
  });

  it('still runs on a push, a label and ready_for_review', () => {
    for (const a of ['synchronize', 'labeled', 'ready_for_review']) {
      expect(schedules(a, bump)).toBe(true);
    }
  });

  it('a lockfile-only change (a transitive oxlint bump) is in the path filter', () => {
    expect(schedules('opened', ['package-lock.json'])).toBe(true);
  });

  it('the job that runs the drift check is the one the trigger feeds', () => {
    const steps = staticAudit.steps.map((s: { run?: string }) => s.run ?? '');
    expect(steps).toContain('npm run oxlint:aliases:check');
    expect(staticAudit.if).toContain("needs.gate.outputs.run == 'true'");
  });
});
