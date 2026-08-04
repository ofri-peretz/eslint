import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

interface TurboTask {
  inputs?: string[];
  outputs?: string[];
  dependsOn?: string[];
  cache?: boolean;
}

const turbo = JSON.parse(readFileSync(resolve(ROOT, 'turbo.json'), 'utf-8')) as {
  tasks: Record<string, TurboTask>;
};

/**
 * Turbo cache-input locks.
 *
 * Background: `test` used to declare an explicit input allowlist —
 * `["src/**", "tsconfig*.json", "vitest.config.*", "vite.config.ts",
 * "package.json"]`. Any test input living outside those globs was invisible to
 * the cache hash, so turbo replayed a stale PASS after the files changed.
 * Demonstrated on 2026-08-03:
 *
 *   - appending `expect(1).toBe(2)` to `apps/docs/tests/mermaid-syntax.test.ts`
 *     → `cache hit, replaying logs` … `FULL TURBO`, exit 0.
 *   - adding a real broken diagram under `apps/docs/content/` → `1650 passed`;
 *     the mermaid lock never ran.
 *
 * `apps/docs` keeps 9 test files in `tests/` and its entire scanned corpus in
 * `content/` — neither matched `src/**`. The fix is `$TURBO_DEFAULT$`: hash
 * every non-ignored file in the workspace, so this cannot silently drift again
 * when someone adds a directory.
 *
 * A hand-maintained allowlist is the bug, not the configuration detail. Do not
 * "optimize" cache hit rate by reintroducing one on a task that gates
 * correctness.
 */
describe('turbo.json cache inputs', () => {
  // Tasks whose green result is a correctness claim. A stale replay here is a
  // false pass, which is strictly worse than a slower run.
  const CORRECTNESS_TASKS = ['test', 'test:coverage'] as const;

  for (const name of CORRECTNESS_TASKS) {
    it(`\`${name}\` must not narrow its inputs to a hand-maintained allowlist`, () => {
      const task = turbo.tasks[name];
      if (!task) return; // task removed entirely — nothing to lock

      // Either omit `inputs` (turbo's default: everything in the workspace) or
      // declare `$TURBO_DEFAULT$` explicitly. Anything else is an allowlist.
      if (task.inputs === undefined) return;

      expect(
        task.inputs,
        `turbo.json tasks.${name}.inputs is an allowlist: ${JSON.stringify(task.inputs)}.\n` +
          `Files outside it do not affect the cache key, so turbo replays a stale\n` +
          `PASS after they change — a green run that proves nothing. Use\n` +
          `["$TURBO_DEFAULT$"] (or omit \`inputs\`) instead.`
      ).toContain('$TURBO_DEFAULT$');
    });
  }

  it('the lock reads a real turbo.json with real tasks', () => {
    // Anti-vacuous guard: every assertion above early-returns on a missing
    // task, so a wrong path or a reshaped file would pass silently. Assert
    // EVERY locked task still exists — checking only `test` would let a
    // renamed or deleted `test:coverage` slip through with a green lock.
    expect(Object.keys(turbo.tasks).length).toBeGreaterThan(5);
    for (const name of CORRECTNESS_TASKS) {
      expect(
        turbo.tasks[name],
        `turbo.json must still have a "${name}" task — if it was renamed, ` +
          `update CORRECTNESS_TASKS so the input-allowlist lock keeps covering it.`
      ).toBeDefined();
    }
    // Tests must NOT depend on any build. Every vitest config that consumes a
    // workspace package aliases it to source (`resolve.alias` -> ../<pkg>/src),
    // so a unit test never needs a compiled dist and Build can run fully in
    // parallel with the shards. Verified: eslint-plugin-node-security runs
    // 69 files / 949 tests with both its own dist and devkit's dist deleted.
    //
    // The one test that genuinely read dist/ (devkit's
    // no-runtime-optional-peer) is a packaging check and moved to the Build
    // job as `test:dist`.
    for (const task of ['test', 'test:coverage'] as const) {
      const deps: string[] = turbo.tasks[task].dependsOn ?? [];
      expect(
        deps,
        `turbo.json "${task}" must not dependOn a build. Unit tests alias ` +
          `workspace deps to source, so a build dependency only serialises ` +
          `the gate. A test that truly needs dist/ belongs in the Build job ` +
          `(see @interlace/eslint-devkit's \`test:dist\`).`
      ).toEqual([]);
    }
  });
});
