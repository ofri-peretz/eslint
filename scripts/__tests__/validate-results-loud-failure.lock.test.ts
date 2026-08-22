/**
 * Lock for the loud-failure fix on `ilb-validate-results`.
 *
 * Two distinct cases, split because they have opposite expected outcomes:
 *
 * 1. **Missing directory** (shallow-clone case) — `benchmarks/results/` is
 *    not present.  This is an expected state documented by
 *    `scorecard-source-integrity.test.ts` line 27 ("shallow clones for
 *    docs-only deploys").  The gate warns and exits 0 — it does not fail,
 *    because there is nothing to validate and the repo considers this
 *    state valid.
 *
 * 2. **Empty directory** (vacuous-pass case) — the directory exists but
 *    contains no JSON files.  This is the dangerous failure mode: the old
 *    validator printed "no result files found." to stdout and exited 0,
 *    letting the quality composite go green while validating zero files.
 *    The fix makes this exit 1.
 *
 * The locks confirm the **absence of the old behaviour**, not the presence
 * of the new: they assert the exit code is NOT the old value, and the old
 * message is NOT on stdout.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'ilb-validate-results.ts');
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
const RESULTS_DIR = join(REPO_ROOT, 'benchmarks', 'results');
const BAK_DIR = RESULTS_DIR + '.bak';

function runWithEmptyDir(extraArgs: string[] = []) {
  const emptyDir = mkdtempSync(join(tmpdir(), 'ilb-validate-empty-'));
  return spawnSync(TSX, [SCRIPT, emptyDir, ...extraArgs], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30_000,
  });
}

function runWithMissingResultsDir(extraArgs: string[] = []) {
  // Temporarily rename benchmarks/results/ so the script's default
  // RESULTS_ROOT resolves to a non-existent path.  try/finally restores
  // it unconditionally — a crash mid-test must not leave the repo
  // without its results directory.
  if (existsSync(BAK_DIR)) renameSync(BAK_DIR, RESULTS_DIR);
  renameSync(RESULTS_DIR, BAK_DIR);
  try {
    return spawnSync(TSX, [SCRIPT, ...extraArgs], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 30_000,
    });
  } finally {
    renameSync(BAK_DIR, RESULTS_DIR);
  }
}

describe('ilb-validate-results — missing results directory (shallow-clone case)', () => {
  it('exits 0 when results directory is missing', () => {
    const result = runWithMissingResultsDir();
    expect(result.status).toBe(0);
  });

  it('does NOT print "no result files found" to stdout (old behaviour used console.log)', () => {
    const result = runWithMissingResultsDir();
    expect(result.stdout).not.toMatch(/no result files found/);
  });
});

describe('ilb-validate-results — empty results directory (vacuous-pass case)', () => {
  it('does NOT exit 0 when given an empty directory', () => {
    const result = runWithEmptyDir();
    expect(result.status).not.toBe(0);
  });

  it('does NOT print "no result files found" to stdout (old behaviour used console.log)', () => {
    const result = runWithEmptyDir();
    expect(result.stdout).not.toMatch(/no result files found/);
  });

  it('does NOT exit 0 with --quiet (old behaviour was silent exit 0)', () => {
    const result = runWithEmptyDir(['--quiet']);
    expect(result.status).not.toBe(0);
  });
});
