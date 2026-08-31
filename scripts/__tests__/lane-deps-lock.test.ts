/**
 * Lock: the lean dependency archive must not omit anything the node lane uses.
 *
 * `.github/actions/setup` restores one of two `node_modules` archives. The
 * `lean` one drops the Next.js/React tree — ~600 MB unpacked that no ESLint
 * plugin, the devkit, the formatters or the tools ever resolve — and the node
 * lane's test shards use it. Measured on run 33337052316: the full archive is
 * 451 MB and costs 13.3s to restore, paid by every one of ten shards, eight of
 * which held nothing but plugins.
 *
 * That is a DENY-LIST over a hoisted tree, so every entry is a claim: "nothing
 * in the node lane resolves this module." A wrong claim is a MODULE_NOT_FOUND
 * in CI. `date-fns` is why this file exists — root-declared, web-looking, and
 * imported by four node-lane packages, so it is deliberately NOT omitted.
 *
 * The check is manifest-level and therefore not exhaustive: it cannot see a
 * transitive resolve. It catches the mistake that is actually easy to make —
 * adding a web dependency to a node-lane workspace, or omitting one that a
 * node-lane workspace already declares — and it fails at review time rather
 * than in a shard.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/lane-deps-lock.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LEAN_LIST = join(ROOT, '.github', 'lean-node-modules.txt');
const SHARD_SCRIPT = join(ROOT, 'scripts', 'ci-test-shard.mts');

/**
 * The packages the node lane's trim step deletes before the cache is saved.
 *
 * Single-sourced from `.github/lean-node-modules.txt`, which the workflow step
 * also reads. Scraping the workflow YAML instead would let the two drift, and
 * the drift is silent in the direction that matters: a package trimmed but not
 * checked here is a MODULE_NOT_FOUND waiting for whichever shard resolves it.
 */
function trimmedPackages(): string[] {
  return readFileSync(LEAN_LIST, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

/** Package names the shard script assigns to the web lane. */
function webLane(): string[] {
  const src = readFileSync(SHARD_SCRIPT, 'utf8');
  const m = /const WEB_LANE = new Set<string>\(\[([^\]]*)\]\)/.exec(src);
  expect(m, 'WEB_LANE not found in ci-test-shard.mts').not.toBeNull();
  return [...(m as RegExpExecArray)[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

type Workspace = { path: string; name: string; deps: string[] };

/** Every workspace manifest, with its declared dependency names. */
function workspaces(): Workspace[] {
  const out: Workspace[] = [];
  for (const wsDir of ['packages', 'apps', 'tools']) {
    const abs = join(ROOT, wsDir);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs)) {
      const manifest = join(abs, entry, 'package.json');
      if (!existsSync(manifest)) continue;
      const pkg = JSON.parse(readFileSync(manifest, 'utf8'));
      out.push({
        path: `${wsDir}/${entry}`,
        name: pkg.name,
        deps: [
          ...Object.keys(pkg.dependencies ?? {}),
          ...Object.keys(pkg.devDependencies ?? {}),
          ...Object.keys(pkg.peerDependencies ?? {}),
        ],
      });
    }
  }
  return out;
}

describe('lean dependency archive', () => {
  const excluded = trimmedPackages();
  const web = new Set(webLane());
  const nodeLane = workspaces().filter((w) => !web.has(w.name));

  it('trims something, or the lean lane is pointless', () => {
    expect(excluded.length).toBeGreaterThan(0);
  });

  // The list is only load-bearing if something reads it. Three archives were
  // measured at ~451 MB while a twelve-entry exclusion list sat in the setup
  // action doing nothing, so "the list exists" is not evidence.
  it('is actually read by the trim step that produces the lean archive', () => {
    const wf = readFileSync(
      join(ROOT, '.github', 'workflows', 'quality-full.yml'),
      'utf8',
    );
    expect(wf).toContain('.github/lean-node-modules.txt');
    expect(wf).toContain('rm -rf "node_modules/${pkg:?}"');
    // The trim must be the LAST step of the node-lane job: post steps (the
    // cache save) run after all main steps, so anything after it would be
    // running against an already-trimmed tree.
    const job = wf.slice(
      wf.indexOf('\n  test:\n'),
      wf.indexOf('\n  test-web:\n'),
    );
    const steps = [...job.matchAll(/^ {6}- (?:name: (.*)|uses: (.*))$/gm)];
    expect(steps.at(-1)?.[1] ?? '').toContain('Trim the web tree');
  });

  it('has a non-empty node lane to protect', () => {
    expect(nodeLane.length).toBeGreaterThan(0);
    // Guards the shape of the test: a rename that made every workspace look
    // web-lane would empty this list and pass everything below vacuously.
    expect(nodeLane.some((w) => w.name.startsWith('eslint-plugin-'))).toBe(
      true,
    );
  });

  it.each(
    // One case per (workspace, excluded dep) pair that actually collides, plus
    // a single passing case when there are none — `it.each` over an empty list
    // would report nothing at all.
    nodeLane.flatMap((w) =>
      w.deps
        .filter((d) => excluded.some((e) => d === e || d.startsWith(`${e}/`)))
        .map((d) => ({ ws: w.path, dep: d })),
    ).length === 0
      ? [{ ws: '(none)', dep: '(none)' }]
      : nodeLane.flatMap((w) =>
          w.deps
            .filter((d) =>
              excluded.some((e) => d === e || d.startsWith(`${e}/`)),
            )
            .map((d) => ({ ws: w.path, dep: d })),
        ),
  )(
    '$ws does not declare $dep, which the lean archive omits',
    ({ ws, dep }) => {
      expect(
        dep,
        `${ws} declares "${dep}", but the lean node_modules archive trims it away. ` +
          'Either move that workspace into WEB_LANE in scripts/ci-test-shard.mts, ' +
          'or drop the entry from .github/lean-node-modules.txt.',
      ).toBe('(none)');
    },
  );

  // The specific finding that motivated the deny-list being short. If someone
  // adds `date-fns` back to the exclusions, four node-lane packages break.
  it('does not trim date-fns — four node-lane packages import it', () => {
    expect(excluded).not.toContain('date-fns');
  });
});
