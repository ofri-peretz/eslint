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
 */
const REQUIRED_CHECKS = ['oxlint (fast pass)', 'Quality (Full) Gate'];

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
  it.each(REQUIRED_CHECKS)(
    'the workflow providing %s exists and triggers on merge_group',
    (check) => {
      const file = workflowProviding(check);
      expect(
        file,
        `no workflow declares a job named "${check}"`,
      ).not.toBeNull();
      expect(
        hasMergeGroupTrigger(file as string),
        `${file} provides the required check "${check}" but has no \`merge_group:\` trigger — ` +
          'every queued merge would block forever',
      ).toBe(true);
    },
  );

  // Guards the shape of the test itself: a typo in REQUIRED_CHECKS would make
  // workflowProviding return null for everything, and `.each` over an empty
  // list would pass vacuously.
  it('is checking a non-empty set of required checks', () => {
    expect(REQUIRED_CHECKS.length).toBeGreaterThan(0);
    for (const c of REQUIRED_CHECKS)
      expect(workflowProviding(c)).not.toBeNull();
  });
});
