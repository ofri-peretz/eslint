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
  // Provided by the `review:` job in `claude-code-review.yml`, which declares
  // no `name:` — so the check takes the job id. Recorded as CodeRabbit until
  // 2026-09-02; the live check run's `app.slug` is `github-actions`. CodeRabbit
  // posts a separate status context named `CodeRabbit`, and branch protection
  // does not require it.
  { name: 'review', source: 'workflow' },
] as const satisfies readonly { name: string; source: 'workflow' | 'app' }[];

const WORKFLOW_CHECKS = REQUIRED_CHECKS.filter((c) => c.source === 'workflow');
const APP_CHECKS = REQUIRED_CHECKS.filter((c) => c.source === 'app');

/**
 * Every check name a workflow file can post.
 *
 * A job's `name:` when it declares one — and **the job id when it does not**,
 * which is what GitHub falls back to. Missing that fallback is what let
 * `review` be recorded as an installed app for two days: the job is declared
 * `review:` in `claude-code-review.yml` with no `name:`, so a scan for a
 * `name:` value found nothing and "no workflow declares it" read as proof of
 * an app. The live API disagreed the whole time — the check run's `app.slug`
 * is `github-actions`, and CodeRabbit posts a separate *status context* named
 * `CodeRabbit`, which branch protection does not require.
 */
function checksProvidedBy(src: string): string[] {
  const jobsAt = src.search(/^jobs:/m);
  if (jobsAt === -1) return [];
  const body = src.slice(jobsAt);

  const heads: { id: string; idx: number }[] = [];
  const jobRe = /^ {2}([A-Za-z0-9_-]+):[ \t]*(?:#.*)?$/gm;
  for (let m = jobRe.exec(body); m !== null; m = jobRe.exec(body))
    heads.push({ id: m[1], idx: m.index });

  return heads.map(({ id, idx }, i) => {
    const segment = body.slice(idx, heads[i + 1]?.idx ?? body.length);
    // A job-level `name:` sits at four spaces; step names carry a `- ` and are
    // deeper, so they cannot be picked up here.
    const declared = /^ {4}name:[ \t]*(.+?)[ \t]*$/m.exec(segment);
    return declared ? declared[1].replace(/^['"]|['"]$/g, '') : id;
  });
}

/** The workflow file that provides `check`, by job `name:` or by job id. */
function workflowProviding(check: string): string | null {
  for (const file of readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'))) {
    const src = readFileSync(join(WORKFLOWS, file), 'utf8');
    if (checksProvidedBy(src).includes(check)) return file;
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
describe('the merge queue readiness verdict', () => {
  it('has no app-provided required check left to block on', () => {
    // Was `['review']` until 2026-09-02, on the belief that CodeRabbit posted
    // it. The live check run says `app.slug: github-actions`, and the job is
    // declared `review:` in claude-code-review.yml. The blocker was never real;
    // the lookup that "proved" it only searched job `name:` fields, and that
    // job has none. An app-provided required check IS a genuine blocker — this
    // stays as the assertion that would catch a real one appearing.
    expect(APP_CHECKS.map((c) => c.name)).toEqual([]);
  });

  it('every required check is provided by a workflow that triggers on merge_group', () => {
    // The whole readiness question in one assertion, derived rather than
    // declared: read the required set, resolve each to its workflow, require
    // the trigger. Nothing here can be satisfied by an entry in a hand-written
    // table.
    const unready = REQUIRED_CHECKS.map(({ name }) => {
      const file = workflowProviding(name);
      if (file === null) return `${name}: no workflow provides it`;
      if (!hasMergeGroupTrigger(file))
        return `${name}: ${file} has no merge_group: trigger`;
      return null;
    }).filter((x): x is string => x !== null);

    expect(unready).toEqual([]);
  });
});
