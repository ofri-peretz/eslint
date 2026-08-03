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
    // task, so a wrong path or a reshaped file would pass silently.
    expect(Object.keys(turbo.tasks).length).toBeGreaterThan(5);
    expect(turbo.tasks.test).toBeDefined();
    expect(turbo.tasks.test.dependsOn).toContain('^build');
  });
});
