/**
 * Lock: the affected-filter's decision must be VISIBLE on the PR.
 *
 * `quality-full.yml` dispatches only the test shards that hold an affected
 * package. When a diff touches no package source the matrix is empty, every
 * `Unit Tests + Coverage (n/10)` job's `if` evaluates false, and GitHub renders
 * **no rows at all** for them. That is correct behaviour and it is
 * indistinguishable, from the PR page, from the matrix step having broken —
 * the failure mode this workflow's own guards exist to prevent. It was read as
 * a regression in review ("how come we run no unit tests now").
 *
 * The `test-scope` job closes that gap by always running and naming the
 * decision. Two things keep it honest, and this file pins both:
 *
 *   1. `scripts/ci-test-shard.mts` must emit `count` — the job name
 *      interpolates it, and a missing output renders as an empty string.
 *   2. The job must stay unconditional (beyond the workflow's own gate) and
 *      must keep BOTH branches in its name, since a name that only ever says
 *      "ran" is exactly as blind as no job.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/visible-test-scope-lock.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOW = join(ROOT, '.github', 'workflows', 'quality-full.yml');
const SHARD_SCRIPT = join(ROOT, 'scripts', 'ci-test-shard.mts');

const workflow = readFileSync(WORKFLOW, 'utf8');

/** The `test-scope:` block, up to the next job at the same indentation. */
function jobBlock(name: string): string {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  expect(start, `no \`${name}:\` job in quality-full.yml`).toBeGreaterThan(-1);
  const rest = workflow.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

describe('the test-scope job keeps the affected-filter decision visible', () => {
  const block = jobBlock('test-scope');

  it('runs whenever the workflow itself runs — never conditioned on `any`', () => {
    const ifLine = /^\s+if:\s*(.+)$/m.exec(block)?.[1] ?? '';
    expect(ifLine).toBe("needs.gate.outputs.run == 'true'");
    // The whole point: gating this job on `any` would delete the very row that
    // reports `any` was false.
    expect(ifLine).not.toContain('any');
  });

  it('names both outcomes, so the check line states which one happened', () => {
    const nameLine = /^\s+name:\s*(.+)$/m.exec(block)?.[1] ?? '';
    expect(nameLine).toContain('needs.gate.outputs.any');
    expect(nameLine).toMatch(/SKIPPED/);
    expect(nameLine).toContain('needs.gate.outputs.shard_count');
  });

  it('reads shard_count from the gate, which reads it from the matrix step', () => {
    expect(jobBlock('gate')).toContain(
      'shard_count: ${{ steps.matrix.outputs.count }}',
    );
  });
});

describe('ci-test-shard.mts feeds it', () => {
  it('emits a `count` output alongside `any`', () => {
    const src = readFileSync(SHARD_SCRIPT, 'utf8');
    // Pinned as one template literal: `any` and `count` are written by the same
    // appendFileSync, so they cannot drift apart.
    expect(src).toContain('count=${shardNumbers.length}');
    expect(src).toContain('any=${shardNumbers.length > 0}');
  });
});
