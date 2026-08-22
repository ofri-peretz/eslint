/**
 * Lock for the loud-failure fix on `ilb-validate-results`.
 *
 * The failure this guards against is a *vacuous pass*: if the results
 * directory is missing or empty, the old validator printed "no result
 * files found." to stdout and exited 0 — the quality composite went
 * green while the vocabulary-contract gate validated zero files.  This
 * is the exact silent failure the extraction plan (§2) calls out.
 *
 * The lock confirms the **absence of the old behaviour**, not the
 * presence of the new: it asserts the exit code is NOT 0, the message
 * is NOT on stdout, and `--quiet` does NOT restore the old silent pass.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'ilb-validate-results.ts');
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');

function runWithEmptyDir(extraArgs: string[] = []) {
  const emptyDir = mkdtempSync(join(tmpdir(), 'ilb-validate-empty-'));
  return spawnSync(TSX, [SCRIPT, emptyDir, ...extraArgs], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30_000,
  });
}

describe('ilb-validate-results — loud failure on empty results', () => {
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
