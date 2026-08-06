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

const turbo = JSON.parse(
  readFileSync(resolve(ROOT, 'turbo.json'), 'utf-8'),
) as {
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
          `["$TURBO_DEFAULT$"] (or omit \`inputs\`) instead.`,
      ).toContain('$TURBO_DEFAULT$');
    });
  }

  // The `build` task legitimately keeps an allowlist — hashing every file in a
  // workspace would rebuild on test-only edits — but the allowlist is
  // per-package, and the program that PRODUCES dist lives at the repo root. It
  // therefore has to be a global dependency, or nothing about it reaches any
  // cache key.
  //
  // Found 2026-08-05 while adding the whitespace-strip pass: six packages came
  // back from cache with unstripped dist, because their entries were written
  // before the pass existed and editing build-package.ts had not invalidated
  // them. The same hole silently covers the comment-strip pass, the .d.ts
  // prune, and the lazy rule-barrel transform — every artifact optimisation in
  // that file can be skipped by a stale cache hit, in CI as well as locally.
  const BUILD_PROGRAM_DEPS = ['scripts/build-package.ts', 'scripts/lib/**'];

  it('build-package.ts and its helpers are global dependencies', () => {
    const globals = (
      JSON.parse(readFileSync(resolve(ROOT, 'turbo.json'), 'utf-8')) as {
        globalDependencies?: string[];
      }
    ).globalDependencies;

    for (const dep of BUILD_PROGRAM_DEPS) {
      expect(
        globals,
        `turbo.json globalDependencies is missing "${dep}".\n` +
          `build-package.ts writes every published artifact, but it is not in\n` +
          `any task's inputs, so editing it does not change a single cache key.\n` +
          `Turbo then restores dist built by the OLD script and the build log\n` +
          `never mentions the package — the optimisation is silently skipped.`,
      ).toContain(dep);
    }
  });

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
          `update CORRECTNESS_TASKS so the input-allowlist lock keeps covering it.`,
      ).toBeDefined();
    }
    // The DEFAULT test task must not depend on any build: vitest configs alias
    // workspace deps to source, so a unit test needs no compiled dist and Build
    // runs fully in parallel with the shards. Verified by deleting dist —
    // eslint-plugin-node-security runs 69 files / 949 tests without it.
    //
    // Six workspaces are genuine exceptions, each for a stated reason:
    //   docs — imports @interlace/ui SUBPATH exports (`@interlace/ui/cn`),
    //          which map to dist/. A bare-name alias cannot cover 56 subpaths.
    //   conventions, modernization, modularity, operability, reliability —
    //          no vitest config at all, so nothing aliases devkit to source.
    //          Give them a config with the alias and the override can go.
    //
    // The meta-config package used to be a seventh exception: its vitest
    // config aliased plugins from a hand-maintained list that had drifted to
    // 19 of 26, so the 7 ORM-security plugins resolved through node_modules to
    // dist/ and needed a build. Completing that list removed the need — its
    // test now pulls 1 task and 0 builds, down from 27 — so no override for it
    // exists here or in turbo.json. Do not re-add one.
    //
    // The point of this lock is that the exception list stays SHORT and
    // explicit. A new blanket `^build` on the default task would serialise the
    // whole gate again, which is what this PR removed.
    const EXPECTED_EXCEPTIONS = new Set([
      'docs',
      'eslint-plugin-conventions',
      'eslint-plugin-modernization',
      'eslint-plugin-modularity',
      'eslint-plugin-operability',
      'eslint-plugin-reliability',
    ]);
    for (const task of ['test', 'test:coverage'] as const) {
      expect(
        turbo.tasks[task].dependsOn ?? [],
        `turbo.json "${task}" (the DEFAULT) must not dependOn a build — that ` +
          `serialises every shard behind a compile. Per-package overrides are ` +
          `the escape hatch; see EXPECTED_EXCEPTIONS.`,
      ).toEqual([]);
    }
    const overrides = Object.keys(turbo.tasks)
      .filter((k) => /#test(:coverage)?$/.test(k))
      .map((k) => k.split('#')[0]);
    const unexpected = [...new Set(overrides)].filter(
      (p) => !EXPECTED_EXCEPTIONS.has(p),
    );
    expect(
      unexpected,
      `these workspaces gained a per-package test build dependency without ` +
        `being listed as a known exception: ${unexpected.join(', ')}. Either ` +
        `alias their workspace deps to source in a vitest config, or add them ` +
        `here with the reason.`,
    ).toEqual([]);
  });
});
