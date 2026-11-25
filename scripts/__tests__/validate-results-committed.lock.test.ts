/**
 * Lock: every committed benchmark result passes `ilb:validate-results`.
 *
 * The validator only ran in the scheduled `benchmark.yml`, so a result file
 * that broke the vocabulary contract could merge through a green PR and fail
 * the next scheduled run instead. That happened: nine `ilb-app-h2h` results
 * landed with a `toolchain` block missing `typescript` and `tsCompiler`, and
 * scheduled run 45474907652 failed three jobs on them (#1728). Running the
 * default (non-strict) mode here makes the same mistake fail the PR that
 * introduces it.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'ilb-validate-results.ts');
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');

describe('ilb-validate-results over the committed results', () => {
  it('reports no fatal issue', () => {
    const result = spawnSync(TSX, [SCRIPT, '--quiet'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 60_000,
    });
    const summary = `${result.stdout}\n${result.stderr}`;
    expect(summary).toMatch(/, 0 fatal\)/);
    expect(result.status).toBe(0);
  });
});
