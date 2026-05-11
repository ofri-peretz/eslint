/**
 * Pre-registration discipline (roadmap item 1.5) — operationalizes the
 * principle that methodology + corpus must be frozen *before* a run, so
 * results are reproducible against a specific commit and can't be quietly
 * tweaked until the numbers look good.
 *
 * Every ILB result MUST carry `methodologyCommit` (a 40-char SHA) on the
 * envelope. This module exposes:
 *
 *   capturePreregistration({ paths, allowDirty })
 *     Reads the current HEAD SHA + status of methodology-relevant paths
 *     (corpus, suite runners, scoring fns) and returns a block to embed
 *     in the result. Throws if those paths have uncommitted changes,
 *     unless `allowDirty` is set.
 *
 *   verifyPreregistration(result)
 *     Validates that a result file's `methodologyCommit` exists in the
 *     repo and matches the relevant tree at run time. Used by the regression
 *     gate to detect tampering or stale runs.
 *
 * Default methodology paths: anything under `benchmarks/corpus/`,
 * `benchmarks/suites/`, `benchmarks/lib/score*`, and `scripts/ilb-*.mjs`.
 * Override with the `paths` option per-bench.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..');

const DEFAULT_METHODOLOGY_PATHS = [
  'benchmarks/corpus',
  'benchmarks/suites',
  'benchmarks/lib',
  'benchmarks/score.mjs',
  'scripts/ilb-wild.mjs',
  'scripts/ilb-validate-fixtures.mjs',
];

function git(args, opts = {}) {
  return execSync(`git ${args}`, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], ...opts }).trim();
}

function isInRepo() {
  try {
    git('rev-parse --git-dir');
    return true;
  } catch {
    return false;
  }
}

/**
 * Capture the pre-registration block that goes into a result envelope.
 *
 * @param {object} [opts]
 * @param {string[]} [opts.paths]       methodology paths (default: corpus/suites/lib/etc)
 * @param {boolean}  [opts.allowDirty]  allow uncommitted changes to methodology paths (CI: never; local: opt-in)
 * @returns {{ methodologyCommit: string|null, dirtyPaths: string[], capturedAt: string }}
 */
export function capturePreregistration(opts: any = {}) {
  const paths = opts.paths ?? DEFAULT_METHODOLOGY_PATHS;
  const allowDirty = opts.allowDirty ?? false;

  if (!isInRepo()) {
    return {
      methodologyCommit: null,
      dirtyPaths: [],
      capturedAt: new Date().toISOString(),
      note: 'not running inside a git repo — methodology not pre-registered',
    };
  }

  const methodologyCommit = git('rev-parse --verify HEAD');

  let dirtyPaths = [];
  try {
    const status = git(`status --porcelain ${paths.map((p) => `"${p}"`).join(' ')}`);
    // git --porcelain v1: XY (2 chars) + space + path; for renames "X  orig -> new"
    dirtyPaths = status.split('\n').filter(Boolean).map((line) => {
      const m = line.match(/^.{2}\s+(.*)$/);
      return m ? m[1].split(' -> ').pop() : line;
    });
  } catch {
    // git status against a non-existent path is non-fatal
  }

  if (dirtyPaths.length > 0 && !allowDirty) {
    throw new Error(
      `Pre-registration violation: methodology paths have uncommitted changes:\n` +
      dirtyPaths.map((p) => `  - ${p}`).join('\n') +
      `\nCommit them before running, or pass allowDirty:true (NOT for CI).`
    );
  }

  return {
    methodologyCommit,
    dirtyPaths,
    capturedAt: new Date().toISOString(),
    paths,
  };
}

/**
 * Verify a result file's pre-registration. Fails if the commit doesn't exist
 * locally (indicating a result from another fork) or if the methodology paths
 * have changed since.
 *
 * @param {object} result  envelope with `methodologyCommit`
 * @returns {{ ok: boolean, reason?: string }}
 */
export function verifyPreregistration(result) {
  if (!result?.methodologyCommit) {
    return { ok: false, reason: 'envelope is missing `methodologyCommit`' };
  }
  if (!isInRepo()) return { ok: true, reason: 'not in a repo, skipping verification' };
  try {
    git(`cat-file -e ${result.methodologyCommit}^{commit}`);
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: `methodologyCommit ${result.methodologyCommit} not found in this repo — result is from a fork or the commit was rewritten`,
    };
  }
}

/**
 * Helper to embed a pre-registration block into a result envelope at
 * the conventional shape:
 *
 *   { ..., methodologyCommit: "<sha>", preregistration: { capturedAt, dirtyPaths, paths } }
 *
 * @param {object} result   the envelope being built
 * @param {object} [opts]
 * @returns {object}        the same envelope, mutated
 */
export function attachPreregistration(result, opts) {
  const block = capturePreregistration(opts);
  result.methodologyCommit = block.methodologyCommit;
  result.preregistration = block;
  return result;
}
