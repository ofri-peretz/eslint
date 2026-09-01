/**
 * Lock: a change to an upstream package must invalidate its dependents' tests.
 *
 * `turbo.json` declared `test.dependsOn: []`. A plugin's test hash therefore
 * covered only that plugin's own files, so editing `@interlace/eslint-devkit`
 * left every dependent plugin's test task a cache HIT — turbo replayed the
 * previous run's stdout and reported success without executing anything.
 *
 * Two mechanisms, and the second undid the first: `scripts/ci-test-shard.mts`
 * correctly computes the dependent closure and SELECTS those plugins to run,
 * and turbo then skipped them. Observed on a real shard: `8 cache hits, 0
 * executions` — a job that reported success having run no tests, while the
 * same shard takes ~80s when the work is actually done.
 *
 * Proven before the fix by editing `packages/eslint-devkit/src/index.ts` and
 * seeing the dependent's hash stay at `617b80a88f5b0023`.
 *
 * This test asserts the BEHAVIOUR, not the config line: it reads the task hash
 * turbo would use, perturbs an upstream source file, and requires the hash to
 * move. `--dry=json` computes hashes without executing, so this costs a couple
 * of seconds and never runs a suite.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/test-cache-sees-upstream-lock.test.ts
 */

import { describe, it, expect, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** A plugin that depends on the devkit, and the upstream file we perturb. */
const DEPENDENT = 'eslint-plugin-jwt-security';
const UPSTREAM = join(ROOT, 'packages', 'eslint-devkit', 'src', 'index.ts');

/** The hash turbo would use for `<pkg>#test`, without running anything. */
function testHash(pkg: string): string {
  const out = execFileSync(
    'npx',
    ['turbo', 'run', 'test', `--filter=${pkg}`, '--dry=json'],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  const plan = JSON.parse(out) as { tasks: { taskId: string; hash: string }[] };
  const task = plan.tasks.find((t) => t.taskId === `${pkg}#test`);
  expect(task, `no \`${pkg}#test\` task in the turbo plan`).toBeDefined();
  return (task as { hash: string }).hash;
}

const original = readFileSync(UPSTREAM, 'utf8');
afterAll(() => writeFileSync(UPSTREAM, original));

describe('the test cache sees upstream changes', () => {
  it('moves a dependent plugin’s test hash when the devkit source changes', () => {
    const before = testHash(DEPENDENT);
    writeFileSync(UPSTREAM, `${original}\n// turbo-cache-invalidation probe\n`);
    const after = testHash(DEPENDENT);
    writeFileSync(UPSTREAM, original);

    expect(
      after,
      `Editing packages/eslint-devkit/src/index.ts left ${DEPENDENT}'s test hash ` +
        `at ${before}. Its tests would replay from cache and report success ` +
        'without running. Check `test.dependsOn` in turbo.json.',
    ).not.toBe(before);
  });

  it('the probe is real — an unchanged tree gives a stable hash', () => {
    // Without this, a `testHash` that returned something random would satisfy
    // the assertion above for the wrong reason.
    expect(testHash(DEPENDENT)).toBe(testHash(DEPENDENT));
  });
}, 60_000);
