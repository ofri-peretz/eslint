import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

/**
 * Locks for the two ways an automated push from CI died silently-but-red.
 *
 * Both failed the same way from the outside: the workflow did all of its real
 * work correctly, printed a clean sync summary, and then lost everything on the
 * final `git push`. Run 31341768906 is the reference for the first, run
 * 31342693115 for the second.
 *
 * 1. `npm ci` runs `prepare` → `lefthook install`, so a workflow that commits
 *    fires the developer pre-commit/commit-msg/pre-push battery on the bot's
 *    own commit. pre-push scopes its build to `...[origin/main]`, so a docs-only
 *    diff built one package while the chained `oxlint:shims:verify` needed dist
 *    for all of them — nine `Cannot find module` failures, push rejected, and
 *    6m52s of a 10-minute job spent re-running gates that have their own CI jobs.
 *
 * 2. Bare `--force-with-lease` resolves its expected value from the
 *    remote-tracking ref. actions/checkout makes a single-branch clone, so
 *    neither that ref nor the fetch refspec that would map it exists, and the
 *    push is rejected as "stale info". Fetching the branch first does NOT fix
 *    it — an unmapped refspec leaves the lease unresolvable either way. The
 *    shape that works is an explicit `--force-with-lease=<ref>:<sha>` read via
 *    `git ls-remote`, which also keeps the protection real: an empty value is
 *    the documented "must not exist yet" form for the create path, and a push
 *    landing after the read is still refused.
 *
 * The failure mode both share is why these are locked: the workflow reports red
 * while behaving correctly, so the temptation is to reach for `--force` or a
 * protection-bypassing token and clear the X without fixing anything.
 */
describe('automated pushes from CI', () => {
  it('disables lefthook for every job, in the shared setup action', () => {
    const setup = read('.github/actions/setup/action.yml');

    expect(setup).toMatch(/LEFTHOOK=0\s*"?\s*>>\s*"?\$GITHUB_ENV/);
  });

  it('docs-data reads an explicit lease value before force-pushing', () => {
    const wf = read('.github/workflows/docs-data.yml');

    // The lease value has to be read from the remote, not inferred.
    expect(wf).toMatch(/LEASE=\$\(git ls-remote origin "refs\/heads\/\$BRANCH"/);

    // ...and the push has to actually use it.
    expect(wf).toMatch(/git push --force-with-lease="\$BRANCH:\$LEASE" origin "\$BRANCH"/);

    // Bare `--force-with-lease` is the broken shape; `--force` throws the
    // protection away entirely. Neither may come back.
    expect(wf).not.toMatch(/--force-with-lease\s+origin/);
    expect(wf).not.toMatch(/git push\s+(-f|--force)\s/);
  });

  it('reads the lease before the branch is repointed', () => {
    const wf = read('.github/workflows/docs-data.yml');
    const lease = wf.indexOf('LEASE=$(git ls-remote');
    const checkout = wf.indexOf('git checkout -B "$BRANCH"');

    expect(lease).toBeGreaterThan(-1);
    expect(checkout).toBeGreaterThan(-1);
    // `checkout -B` moves the local branch; reading the remote afterwards would
    // still work, but ordering it first keeps the lease a snapshot of what we
    // looked at before touching anything.
    expect(lease).toBeLessThan(checkout);
  });

  it('still opens a PR rather than pushing the sync straight to main', () => {
    const wf = read('.github/workflows/docs-data.yml');

    // main requires up-to-date branches and linear history by policy. The
    // previous incarnation pushed to main and failed every run with GH006.
    expect(wf).toMatch(/gh pr create --base main --head "\$BRANCH"/);
    expect(wf).not.toMatch(/git push origin main/);
    expect(wf).not.toMatch(/git push\s*$/m);
  });
});
