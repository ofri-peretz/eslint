/**
 * Affected-package decision for the CI test sharder.
 *
 * Lives in its own module so the lock test can import the decision without
 * executing scripts/ci-test-shard.mts's CLI (which discovers packages, walks
 * the tree, and calls process.exit).
 */

/**
 * Inputs whose blast radius cannot be bounded from the diff — any change to one
 * means run every package. Deliberately includes this sharder's own sources: a
 * change to the bucketing or the decision below must be validated against the
 * whole suite, not against the subset the new logic happens to select.
 */
export const GLOBAL_INPUTS = new Set([
  'package-lock.json',
  'turbo.json',
  'tsconfig.base.json',
  'tsconfig.solution.json',
  '.nvmrc',
  '.github/actions/setup/action.yml',
  '.github/workflows/quality-full.yml',
  'scripts/ci-test-shard.mts',
  'scripts/lib/ci-shard-affected.mts',
]);

/** Minimal shape needed here; the sharder's Pkg is structurally compatible. */
export type AffectedPkg = { name: string; dir: string };

export type Decision =
  | { mode: 'all'; why: string }
  | { mode: 'none'; why: string }
  | { mode: 'some'; names: Set<string> }
  | { mode: 'bug'; dirs: string[] };

/**
 * Decide what a run should execute, given the changed-file list.
 *
 * `bug` is the reason this exists. `--filter=...[origin/main]` silently
 * selected nothing and exited 0, so a PR could report a green tests check
 * having run none (observed on PR #355). Here, "package files changed but
 * nothing resolved" is an explicit defect state, and "nothing testable
 * changed" is a separate, stated outcome — never inferred from silence.
 *
 * @param changed changed paths relative to repo root, or null if no merge-base
 */
export function decideAffected(changed: string[] | null, testable: AffectedPkg[]): Decision {
  if (changed === null) return { mode: 'all', why: 'no merge-base with the base ref' };
  if (changed.some((f) => GLOBAL_INPUTS.has(f))) return { mode: 'all', why: 'a global input changed' };

  const touchedDirs = new Set(
    changed.map((f) => f.split('/').slice(0, 2).join('/')).filter((d) => /^(packages|apps|tools)\//.test(d)),
  );
  const directly = testable.filter((p) => touchedDirs.has(p.dir));

  if (touchedDirs.size > 0 && directly.length === 0) return { mode: 'bug', dirs: [...touchedDirs] };
  if (touchedDirs.size === 0) return { mode: 'none', why: 'no package sources changed' };
  return { mode: 'some', names: new Set(directly.map((p) => p.name)) };
}
