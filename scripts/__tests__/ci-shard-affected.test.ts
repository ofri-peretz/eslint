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
  { name: 'eslint-plugin-jwt', dir: 'packages/eslint-plugin-jwt' },
  { name: 'eslint-plugin-pg', dir: 'packages/eslint-plugin-pg' },
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
    const d = decideAffected(['packages/eslint-plugin-jwt/src/index.ts'], PKGS);
    expect(d.mode).toBe('some');
    expect(d.mode === 'some' && [...d.names]).toEqual(['eslint-plugin-jwt']);
  });

  it('selects multiple packages when several change', () => {
    const d = decideAffected(
      ['packages/eslint-plugin-jwt/src/a.ts', 'apps/docs/src/b.tsx'],
      PKGS,
    );
    expect(d.mode === 'some' && [...d.names].sort()).toEqual(['docs', 'eslint-plugin-jwt']);
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
