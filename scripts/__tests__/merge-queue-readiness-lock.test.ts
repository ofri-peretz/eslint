/**
 * Lock: a required check must report inside the merge queue.
 *
 * A merge queue builds `refs/heads/gh-readonly-queue/main/...` and waits for
 * the REQUIRED status checks to report on a `merge_group` event. A workflow
 * that provides a required check but does not trigger on `merge_group` never
 * reports, so every queued merge blocks **forever, with no error message** —
 * strictly worse than the run amplification the queue exists to remove.
 *
 * The trigger is therefore a precondition of enabling the queue, and this test
 * is what keeps it true afterwards: deleting `merge_group:` from either
 * workflow would wedge merges repo-wide, and nothing else would catch it until
 * the next merge silently hung.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/merge-queue-readiness-lock.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOWS = join(ROOT, '.github', 'workflows');

/**
 * Required status checks on `main`, as configured in branch protection.
 *
 * Kept in sync by hand — GitHub's branch-protection API is not reachable from
 * a unit test. If branch protection changes, this list changes with it; a
 * required check missing here is a required check nobody verified is
 * queue-ready. Verify with:
 *   gh api repos/ofri-peretz/eslint/branches/main/protection/required_status_checks
 *
 * `source` matters as much as the name. A check emitted by a workflow in this
 * repo can be made queue-ready by adding a `merge_group:` trigger — a one-line
 * change we control. A check posted by an INSTALLED APP cannot: apps subscribe
 * to `pull_request`, and `refs/heads/gh-readonly-queue/...` is not a pull
 * request, so the app never posts a status and the queue waits on a context
 * that will never arrive. That is not a bug we can fix in this repo; the only
 * remedies are to drop the context from the required list before enabling the
 * queue, or to leave the queue off.
 */
const REQUIRED_CHECKS = [
  { name: 'oxlint (fast pass)', source: 'workflow' },
  { name: 'Quality (Full) Gate', source: 'workflow' },
  // CodeRabbit. Verified on PR #770: reported in 1m30s on a `pull_request`
  // event from run 33337052342, which no workflow in `.github/workflows`
  // declares.
  { name: 'review', source: 'app' },
] as const satisfies readonly { name: string; source: 'workflow' | 'app' }[];

const WORKFLOW_CHECKS = REQUIRED_CHECKS.filter((c) => c.source === 'workflow');
const APP_CHECKS = REQUIRED_CHECKS.filter((c) => c.source === 'app');

/** The workflow file that declares a job whose `name:` is `check`. */
function workflowProviding(check: string): string | null {
  for (const file of readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'))) {
    const src = readFileSync(join(WORKFLOWS, file), 'utf8');
    // Job names are quoted or bare; match the `name:` value exactly.
    const re = new RegExp(
      `^\\s+name:\\s*['"]?${check.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]?\\s*$`,
      'm',
    );
    if (re.test(src)) return file;
  }
  return null;
}

/** Does this workflow listen for the merge queue's event? */
function hasMergeGroupTrigger(file: string): boolean {
  const src = readFileSync(join(WORKFLOWS, file), 'utf8');
  return /^\s{2}merge_group:/m.test(src);
}

describe('merge queue readiness', () => {
  it.each(WORKFLOW_CHECKS)(
    'the workflow providing $name exists and triggers on merge_group',
    ({ name }) => {
      const file = workflowProviding(name);
      expect(file, `no workflow declares a job named "${name}"`).not.toBeNull();
      expect(
        hasMergeGroupTrigger(file as string),
        `${file} provides the required check "${name}" but has no \`merge_group:\` trigger — ` +
          'every queued merge would block forever',
      ).toBe(true);
    },
  );

  // The classification is the load-bearing part, so it cannot be taken on
  // trust. A check marked `app` that some workflow actually declares is a
  // mislabel that would keep a fixable blocker permanently excused.
  it.each(APP_CHECKS)(
    '$name is genuinely app-provided — no workflow declares it',
    ({ name }) => {
      expect(
        workflowProviding(name),
        `"${name}" is classified as app-provided, but a workflow declares a job with that name. ` +
          'Reclassify it as `workflow` so the merge_group assertion applies.',
      ).toBeNull();
    },
  );

  // Guards the shape of the test itself: a typo in REQUIRED_CHECKS would make
  // workflowProviding return null for everything, and `.each` over an empty
  // list would pass vacuously.
  it('is checking a non-empty set of required checks', () => {
    expect(REQUIRED_CHECKS.length).toBeGreaterThan(0);
    expect(WORKFLOW_CHECKS.length).toBeGreaterThan(0);
    for (const { name } of WORKFLOW_CHECKS)
      expect(workflowProviding(name)).not.toBeNull();
  });
});

/**
 * The readiness VERDICT, kept separate from the per-check assertions above.
 *
 * The file used to be named "merge queue readiness" while asserting only that
 * the two workflow-provided checks carried a `merge_group:` trigger. Both did,
 * so it was green — and it was green while a third required context, `review`,
 * sat outside the list entirely. Enabling the queue on that evidence would
 * have hung every merge with no error message, which is the exact failure the
 * file's own header warns about. A lock that answers a narrower question than
 * its name implies is worse than no lock: it converts "unverified" into
 * "verified".
 */
describe('the merge queue is not safe to enable yet', () => {
  it('names every app-provided required check as a blocker', () => {
    // Not a TODO. This assertion is the record of WHY the queue is off, and it
    // flips on its own the moment the blocking contexts are gone: drop `review`
    // from branch protection and from REQUIRED_CHECKS, and this test starts
    // reporting the queue as safe.
    const blockers = APP_CHECKS.map((c) => c.name);
    expect(blockers).toEqual(['review']);
  });
});
