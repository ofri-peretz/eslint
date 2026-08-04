import { execFileSync } from 'node:child_process';

/**
 * The changed-file list a run should reason about, or null if it cannot be
 * determined (callers treat null as "run everything").
 *
 * Why this is not simply `git merge-base HEAD origin/main`:
 *
 * On a `pull_request` event, actions/checkout fetches `refs/pull/N/merge` and
 * does NOT create `refs/remotes/origin/main`. So `origin/main` never resolves,
 * merge-base fails, and every PR fell back to "run everything" — silently,
 * because the fallback is safe. Verified in the gate logs of PR #368:
 *
 *   Dispatching 10 of 10 shards (all packages (no merge-base with the base ref))
 *   Dispatching 4 of 4 build shards (all 33 workspaces (no merge-base ...))
 *
 * Both at fetch-depth 50 AND at fetch-depth 0 — depth was never the problem,
 * the missing ref was. The affected filtering had therefore never once taken
 * effect on a pull request.
 *
 * The fix is to be handed the base commit directly (the workflow passes
 * `github.event.pull_request.base.sha`) and to fetch it if the shallow clone
 * does not already contain it.
 */
export type BaseResolution =
  | { ok: true; base: string; changed: string[] }
  | { ok: false; why: string };

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function resolves(ref: string, cwd: string): boolean {
  try {
    git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], cwd);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param baseRef a commit SHA or ref name to diff against
 * @param cwd     repo root
 */
export function changedFilesSince(baseRef: string, cwd: string): BaseResolution {
  let base = baseRef;

  // Deepen only if we have to: a shallow PR clone often lacks the base commit.
  if (!resolves(base, cwd)) {
    for (const attempt of [
      ['fetch', '--no-tags', '--depth=50', 'origin', baseRef],
      ['fetch', '--no-tags', '--depth=500', 'origin', baseRef],
      ['fetch', '--no-tags', '--unshallow', 'origin'],
    ]) {
      try {
        git(attempt, cwd);
      } catch {
        continue;
      }
      if (resolves(base, cwd)) break;
      // A ref name may have landed as FETCH_HEAD rather than a remote branch.
      if (resolves('FETCH_HEAD', cwd)) {
        base = git(['rev-parse', 'FETCH_HEAD'], cwd);
        break;
      }
    }
  }

  if (!resolves(base, cwd)) {
    return { ok: false, why: `base ref "${baseRef}" could not be resolved or fetched` };
  }

  let mergeBase: string;
  try {
    mergeBase = git(['merge-base', 'HEAD', base], cwd);
  } catch {
    return { ok: false, why: `no merge-base between HEAD and "${baseRef}"` };
  }

  const out = git(['diff', '--name-only', `${mergeBase}...HEAD`], cwd);
  return { ok: true, base: mergeBase, changed: out.split('\n').filter(Boolean) };
}

/**
 * Shout when the base cannot be resolved.
 *
 * Falling back to "run everything" is SAFE — it over-tests, never under-tests —
 * so this must not fail the build. But it silently disables the entire affected
 * optimisation, which is how it went unnoticed across every PR. A CI warning
 * annotation makes it visible in the run summary instead of one line of log.
 */
export function warnUnresolvedBase(why: string): void {
  console.log(
    `::warning title=Affected filtering disabled::${why}. Falling back to running EVERY package. ` +
      `This is safe but wastes the whole affected-detection optimisation — check that the workflow ` +
      `passes CI_TEST_SHARD_BASE (github.event.pull_request.base.sha) and that checkout fetched it.`,
  );
}
