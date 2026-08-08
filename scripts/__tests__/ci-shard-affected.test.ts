/**
 * Lock for the affected-package decision.
 *
 * This is the logic that decides whether a PR runs 1 package or 33, so a bug
 * here either wastes the whole optimisation or — far worse — skips tests while
 * reporting green. That second failure is exactly what `--filter=...[origin/main]`
 * did before #356: it selected nothing, turbo exited 0, and the check passed
 * having run no tests. The `bug` outcome exists so that state is loud, and this
 * file exists so `bug` can't be quietly softened into a pass later.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import {
  bucket,
  decideAffected,
  expandDependents,
  GLOBAL_INPUTS,
  reverseDeps,
  type AffectedPkg,
} from '../lib/ci-shard-affected.mts';

const PKGS: AffectedPkg[] = [
  { name: 'eslint-plugin-jwt-security', dir: 'packages/eslint-plugin-jwt-security' },
  { name: 'eslint-plugin-postgresql-security', dir: 'packages/eslint-plugin-postgresql-security' },
  { name: 'docs', dir: 'apps/docs' },
];

describe('decideAffected', () => {
  it('runs everything when there is no merge-base', () => {
    // Shallow clone / fork / detached main: we cannot reason about the diff, so
    // the safe direction is more testing, not less.
    expect(decideAffected(null, PKGS).mode).toBe('all');
  });

  it.each([...GLOBAL_INPUTS])('runs everything when %s changes', (file) => {
    expect(decideAffected([file], PKGS).mode).toBe('all');
  });

  it('treats its own sources as global inputs', () => {
    // A change to the sharder must be validated against the full suite, not
    // against the subset the new logic happens to pick.
    expect(GLOBAL_INPUTS.has('scripts/ci-test-shard.mts')).toBe(true);
    expect(GLOBAL_INPUTS.has('scripts/lib/ci-shard-affected.mts')).toBe(true);
    // ci-build.mts too: a change to the build filter must be validated by a
    // full build, not by the filter it is changing.
    expect(GLOBAL_INPUTS.has('scripts/ci-build.mts')).toBe(true);
  });

  it('selects only the packages whose directories changed', () => {
    const d = decideAffected(['packages/eslint-plugin-jwt-security/src/index.ts'], PKGS);
    expect(d.mode).toBe('some');
    expect(d.mode === 'some' && [...d.names]).toEqual(['eslint-plugin-jwt-security']);
  });

  it('selects multiple packages when several change', () => {
    const d = decideAffected(
      ['packages/eslint-plugin-jwt-security/src/a.ts', 'apps/docs/src/b.tsx'],
      PKGS,
    );
    expect(d.mode === 'some' && [...d.names].sort()).toEqual(['docs', 'eslint-plugin-jwt-security']);
  });

  it('reports "none" — not a silent pass — when no package changed', () => {
    const d = decideAffected(['.github/workflows/a11y.yml', 'README.md'], PKGS);
    expect(d.mode).toBe('none');
  });

  it('reports "bug" when package files changed but nothing resolved', () => {
    // The invariant the old filter lacked. An unknown package directory must
    // fail loudly rather than silently testing nothing.
    const d = decideAffected(['packages/brand-new-plugin/src/index.ts'], PKGS);
    expect(d.mode).toBe('bug');
    expect(d.mode === 'bug' && d.dirs).toEqual(['packages/brand-new-plugin']);
  });

  it('never returns "none" when any package path changed', () => {
    // Property check across every known package plus an unknown one: whatever
    // the outcome, it must not be the "nothing to do, pass" branch.
    for (const p of [...PKGS.map((p) => p.dir), 'packages/unknown', 'tools/whatever']) {
      expect(decideAffected([`${p}/src/x.ts`], PKGS).mode).not.toBe('none');
    }
  });
});

describe('unit tests never need a build', () => {
  it('every vitest config consuming a workspace package aliases it to source', () => {
    // This is what lets `test` run with `dependsOn: []`. If a new package
    // imports @interlace/eslint-devkit without the alias, vitest resolves it
    // through node_modules to dist/ — the test then silently requires a build,
    // and the whole parallel-build/test design regresses without any check
    // going red. Fail here instead.
    const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
    const offenders: string[] = [];
    for (const entry of fs.readdirSync(path.join(root, 'packages'))) {
      const dir = path.join(root, 'packages', entry);
      const cfg = path.join(dir, 'vitest.config.mts');
      const manifest = path.join(dir, 'package.json');
      if (!fs.existsSync(cfg) || !fs.existsSync(manifest)) continue;
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
      if (!deps['@interlace/eslint-devkit']) continue;
      const src = fs.readFileSync(cfg, 'utf8');
      if (!/@interlace\/eslint-devkit['"]\s*:\s*resolve\(/.test(src)) offenders.push(entry);
    }
    expect(offenders, `these vitest configs use @interlace/eslint-devkit but do not alias it to source: ${offenders.join(', ')}`).toEqual([]);
  });
});

/**
 * Shards must PARTITION the work, not replicate it.
 *
 * The regression this locks: both sharders used to build their turbo filters as
 * `--filter=...<pkg>` — package *and its dependents* — once per shard. Dependents
 * were not restricted to the shard's own bucket, so a shard holding any plugin
 * pulled in every downstream workspace, and so did every other shard. Ten shards
 * ran the same downstream tests ten times. The code justified it as "cheap
 * replays from a warm cache", but PR jobs restore the Turbo cache read-only under
 * a per-SHA key, so they were full re-runs.
 *
 * The fix is ordering: expand dependents ONCE into a closure, then partition the
 * closure. These tests lock both halves — the closure is still complete, and the
 * partition has no overlap.
 */
describe('shards partition the work', () => {
  const GRAPH: AffectedPkg[] = [
    { name: 'devkit', dir: 'packages/eslint-devkit', deps: [] },
    { name: 'plugin-a', dir: 'packages/plugin-a', deps: ['devkit'] },
    { name: 'plugin-b', dir: 'packages/plugin-b', deps: ['devkit'] },
    { name: 'meta', dir: 'packages/meta', deps: ['plugin-a', 'plugin-b'] },
    { name: 'docs', dir: 'apps/docs', deps: ['meta', 'vendor-external'] },
    { name: 'unrelated', dir: 'packages/unrelated', deps: [] },
  ];
  const REV = reverseDeps(GRAPH);

  it('reverseDeps ignores dependencies outside the workspace', () => {
    // `vendor-external` is an npm dep, not a workspace. If it leaked into the
    // graph, an unrelated registry package could drag the whole repo in.
    expect([...REV.keys()].sort()).toEqual(['devkit', 'meta', 'plugin-a', 'plugin-b']);
  });

  it('expands transitively — a devkit change reaches docs', () => {
    // Two hops: devkit -> plugin-a -> meta -> docs. A shallow (direct-only)
    // expansion would stop at the plugins and silently skip docs.
    expect([...expandDependents(['devkit'], REV)].sort()).toEqual([
      'devkit', 'docs', 'meta', 'plugin-a', 'plugin-b',
    ]);
    expect(expandDependents(['devkit'], REV).has('unrelated')).toBe(false);
  });

  it('terminates on a dependency cycle', () => {
    const cyclic = reverseDeps([
      { name: 'x', dir: 'packages/x', deps: ['y'] },
      { name: 'y', dir: 'packages/y', deps: ['x'] },
    ]);
    expect([...expandDependents(['x'], cyclic)].sort()).toEqual(['x', 'y']);
  });

  it('decideAffected returns the closure when given the graph', () => {
    const d = decideAffected(['packages/eslint-devkit/src/index.ts'], GRAPH, REV);
    expect(d.mode).toBe('some');
    if (d.mode !== 'some') return;
    // Every dependent is present — this is what makes a plain `--filter=<pkg>`
    // safe. Drop the closure and the sharders would under-test.
    expect([...d.names].sort()).toEqual(['devkit', 'docs', 'meta', 'plugin-a', 'plugin-b']);
  });

  it('bucketing the closure yields disjoint shards covering it exactly once', () => {
    const d = decideAffected(['packages/eslint-devkit/src/index.ts'], GRAPH, REV);
    if (d.mode !== 'some') throw new Error('expected some');
    const sel = GRAPH.filter((p) => d.names.has(p.name)).map((p) => ({ ...p, cost: 1 }));
    for (const n of [1, 3, 10]) {
      const flat = bucket(sel, n).flat().map((p) => p.name);
      expect(new Set(flat).size, `shardTotal=${n} duplicated a package across shards`).toBe(flat.length);
      expect(flat.sort()).toEqual([...d.names].sort());
    }
  });

  it('neither sharder uses turbo\'s `...<pkg>` dependent operator', () => {
    // The direct lock on the bug. `--filter=...<pkg>` inside a per-shard command
    // re-expands dependents on every shard, which is the duplication itself.
    // Dependents belong in the closure above, not in the filter.
    for (const f of ['ci-test-shard.mts', 'ci-build.mts']) {
      const scriptsDir = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
      const src = fs.readFileSync(path.join(scriptsDir, f), 'utf8');
      const offenders = src
        .split('\n')
        .filter((l) => /--filter=\$\{?\.\.\.|--filter=\.\.\./.test(l) && !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'));
      expect(
        offenders,
        `${f} builds a turbo filter with the \`...\` dependent operator. That re-expands ` +
          `dependents on EVERY shard, so the same packages run once per shard. Put them in ` +
          `the affected closure (decideAffected + reverseDeps) and filter with a plain name.`,
      ).toEqual([]);
    }
  });
});

/**
 * A vitest run that matches no files must never be a pass.
 *
 * devkit's `test:dist` names one file on the command line, but a CLI positional
 * filter does NOT override the config's `exclude` — so when that file was
 * excluded outright, vitest matched nothing and printed "No test files found".
 * It exited 1 only because `passWithNoTests` is false. Flip that flag and the
 * same gate reports success having verified nothing, which is the failure mode
 * this repo keeps rediscovering.
 */
describe('no vitest config may pass with zero tests', () => {
  it('passWithNoTests is never true', () => {
    const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
    const configs: string[] = [];
    for (const ws of ['packages', 'apps', 'tools']) {
      const dir = path.join(root, ws);
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir)) {
        for (const name of ['vitest.config.mts', 'vitest.config.ts']) {
          const f = path.join(dir, entry, name);
          if (fs.existsSync(f)) configs.push(f);
        }
      }
    }
    expect(configs.length, 'found no vitest configs — this lock would be vacuous').toBeGreaterThan(5);

    const offenders = configs.filter((f) => /passWithNoTests:\s*true/.test(fs.readFileSync(f, 'utf8')));
    expect(
      offenders.map((f) => path.relative(root, f)),
      'these configs would report success when their filter matches no test files',
    ).toEqual([]);
  });
});

/**
 * Shard assignment must be a pure function of the repo, never of the diff.
 *
 * The Turbo cache is scoped per shard (turbo-cache-scope: build-N /
 * test-shard-N). If a package's shard number moved with the affected set —
 * shard 2 on one PR, shard 3 on the next — its cached output would sit in a
 * lineage the next run never restores, and every build would miss while still
 * reporting "cache enabled". Silent, and it looks like sharding simply not
 * helping.
 *
 * Both sharders therefore bucket the FULL package list and intersect with the
 * affected set afterwards. Bucketing the affected subset directly is the bug.
 */
describe('shard assignment does not depend on the affected set', () => {
  const scriptsDir = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');

  it('bucket() is called on the full universe, not the filtered selection', () => {
    // ci-build.mts: must bucket `all` (every workspace), then filter by name.
    const build = fs.readFileSync(path.join(scriptsDir, 'ci-build.mts'), 'utf8');
    expect(
      /bucket\(\s*ordered\s*,/.test(build) && /\[\.\.\.all\]\.sort/.test(build),
      'ci-build.mts must sort/bucket `all`, not `selected` — bucketing the affected ' +
        'subset makes a package hop shards between PRs and invalidates its per-shard ' +
        'Turbo cache lineage on every run.',
    ).toBe(true);
    expect(
      /bucket\(\s*\[?\.*selected/.test(build),
      'ci-build.mts appears to bucket `selected` directly — see above.',
    ).toBe(false);

    // ci-test-shard.mts: buckets `testable` (all test-bearing packages) before
    // the affected filter is applied to `mine`.
    const test = fs.readFileSync(path.join(scriptsDir, 'ci-test-shard.mts'), 'utf8');
    expect(
      /bucket\(testable,\s*shardTotal\)/.test(test),
      'ci-test-shard.mts must bucket `testable` (the full universe) — see above.',
    ).toBe(true);
  });

  it('bucketing is deterministic for a fixed input', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ name: `p${i}`, cost: (i * 7) % 13 }));
    const a = bucket([...items].sort((x, y) => y.cost - x.cost || x.name.localeCompare(y.name)), 4);
    const b = bucket([...items].sort((x, y) => y.cost - x.cost || x.name.localeCompare(y.name)), 4);
    expect(a.map((s) => s.map((p) => p.name))).toEqual(b.map((s) => s.map((p) => p.name)));
  });

  it('removing an unaffected package from the SELECTION does not move others', () => {
    // The property the lock above enforces structurally, asserted behaviourally:
    // bucket the full list once, then filter — every survivor keeps its shard.
    const all = Array.from({ length: 20 }, (_, i) => ({ name: `p${i}`, cost: (i * 7) % 13 }));
    const ordered = [...all].sort((x, y) => y.cost - x.cost || x.name.localeCompare(y.name));
    const buckets = bucket(ordered, 4);
    const shardOf = (n: string) => buckets.findIndex((b) => b.some((p) => p.name === n));

    const affected = new Set(['p3', 'p11', 'p17']);
    const filtered = buckets.map((b) => b.filter((p) => affected.has(p.name)));
    for (const n of affected) {
      expect(filtered.findIndex((b) => b.some((p) => p.name === n)), `${n} moved shard`).toBe(shardOf(n));
    }
  });
});

/**
 * `emitDeclarationOnly` is only safe where something else emits the .js.
 *
 * scripts/build-package.ts compiles twice — `tsc --build` for the artifact,
 * then a `--removeComments` pass that copies only the .js back over dist. That
 * second pass is what lets pass 1 skip .js emit entirely.
 *
 * Packages that do NOT build through build-package.ts have no second pass, so
 * setting emitDeclarationOnly there produces a dist with .d.ts and no runtime
 * code at all. That is exactly what happened to @interlace/ui, whose build is
 * a plain `tsc -b`: every consumer broke with "Can't resolve
 * '@interlace/ui/cn'", and it took a CI run to surface because the package
 * still "built" successfully — it just emitted nothing executable.
 */
describe('emitDeclarationOnly requires a second .js-emitting pass', () => {
  it('every package with emitDeclarationOnly builds via build-package.ts', () => {
    const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '../..');
    const pkgsDir = path.join(root, 'packages');
    const offenders: string[] = [];
    let checked = 0;

    for (const entry of fs.readdirSync(pkgsDir)) {
      const tsconfig = path.join(pkgsDir, entry, 'tsconfig.lib.json');
      const manifest = path.join(pkgsDir, entry, 'package.json');
      if (!fs.existsSync(tsconfig) || !fs.existsSync(manifest)) continue;
      if (!/"emitDeclarationOnly"\s*:\s*true/.test(fs.readFileSync(tsconfig, 'utf8'))) continue;
      checked++;
      const build = JSON.parse(fs.readFileSync(manifest, 'utf8')).scripts?.build ?? '';
      if (!build.includes('build-package')) offenders.push(`${entry} (build: ${build || 'none'})`);
    }

    expect(checked, 'no package sets emitDeclarationOnly — this lock would be vacuous').toBeGreaterThan(5);
    expect(
      offenders,
      `these packages set emitDeclarationOnly but do not build through ` +
        `scripts/build-package.ts, so nothing emits their .js and they would ` +
        `ship declarations with no runtime code`,
    ).toEqual([]);
  });
});
