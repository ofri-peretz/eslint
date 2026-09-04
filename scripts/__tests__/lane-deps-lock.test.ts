/**
 * Lock: the lean dependency archive must not omit anything the node lane uses.
 *
 * The node lane's shards restore a `node_modules` with the Next.js/React tree
 * deleted — ~739 MB, produced by the trim step at the end of the job. Measured
 * on the first lean hit: 279,862,807 B against the full 451,051,181, restore
 * 13.0s -> 5.6s.
 *
 * That is only safe while no node-lane workspace resolves a trimmed package.
 * The first implementation decided lanes from a hardcoded `WEB_LANE` name set,
 * which is wrong in the one direction that fails silently: a new or renamed
 * workspace with the web dependency closure keeps getting lean dependencies
 * until a human remembers to add it. Lanes are now DERIVED from manifests, and
 * this file checks the derivation rather than a list — the repo's own rule is
 * that a rule decides by evidence, never by a name.
 *
 * Run from the repo root:
 *   npx vitest run scripts/__tests__/lane-deps-lock.test.ts
 */

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const LEAN_LIST = join(ROOT, '.github', 'lean-node-modules.txt');
const SCRIPT = join(ROOT, 'scripts', 'ci-test-shard.mts');
const WORKFLOW = join(ROOT, '.github', 'workflows', 'quality-full.yml');

/** Packages the trim step deletes before the lean archive is saved. */
function trimmedPackages(): string[] {
  return readFileSync(LEAN_LIST, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

type Workspace = {
  path: string;
  name: string;
  deps: string[];
  hasTests: boolean;
};

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
        hasTests: Boolean(pkg.scripts?.test || pkg.scripts?.['test:coverage']),
      });
    }
  }
  return out;
}

/**
 * Which workspaces need the web tree — computed HERE, independently of the
 * script, so the two can disagree.
 *
 * Deriving the expectation by calling the code under test is the classic way a
 * lock agrees with a bug: it would pass whatever the script decided. This
 * mirrors the rule (declares a trimmed package, or depends on a workspace that
 * does) from the manifests directly.
 */
function expectedWebLane(): Set<string> {
  const all = workspaces();
  const trimmed = new Set(trimmedPackages());
  const web = new Set(
    all
      .filter((w) =>
        w.deps.some((d) => trimmed.has(d) || trimmed.has(d.split('/')[0])),
      )
      .map((w) => w.name),
  );
  const names = new Set(all.map((w) => w.name));
  for (let changed = true; changed;) {
    changed = false;
    for (const w of all) {
      if (web.has(w.name)) continue;
      if (w.deps.some((d) => names.has(d) && web.has(d))) {
        web.add(w.name);
        changed = true;
      }
    }
  }
  return web;
}

/** Package names the script actually puts in a lane, via its plan output. */
function scriptLane(lane: 'node' | 'web', total: number): Set<string> {
  const names = new Set<string>();
  for (let shard = 1; shard <= total; shard++) {
    const out = execFileSync(
      'node',
      [SCRIPT, String(shard), String(total), '--lane', lane],
      {
        cwd: ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          CI_TEST_SHARD_PLAN_ONLY: '1',
          CI_TEST_SHARD_ALL: '1',
        },
      },
    );
    for (const m of out.matchAll(
      /^ {2}(\S+)(?: \[slice \d+\/\d+\])? {2}\((?:test|test:coverage), ~?\d+s\)$/gm,
    ))
      names.add(m[1]);
  }
  return names;
}

describe('lane membership is derived from dependency evidence', () => {
  const trimmed = trimmedPackages();
  const expectedWeb = expectedWebLane();
  const all = workspaces().filter((w) => w.hasTests);

  it('trims something, or the lean lane is pointless', () => {
    expect(trimmed.length).toBeGreaterThan(0);
  });

  it('finds web-lane workspaces by evidence, not by an empty result', () => {
    // Non-vacuity: if the derivation found nothing, every assertion comparing
    // the two sets below would pass while the node lane silently swallowed the
    // docs app.
    expect(expectedWeb.size).toBeGreaterThan(0);
    expect(all.length).toBeGreaterThan(20);
  });

  it('the script puts exactly the evidence-derived workspaces in the web lane', () => {
    const actual = scriptLane('web', 3);
    expect([...actual].sort()).toEqual(
      [...expectedWeb].filter((n) => all.some((w) => w.name === n)).sort(),
    );
  });

  it('no node-lane workspace declares anything the lean archive trims', () => {
    const offenders = [...scriptLane('node', 4)]
      .map((name) => all.find((w) => w.name === name))
      .filter((w): w is Workspace => Boolean(w))
      .flatMap((w) =>
        w.deps
          .filter((d) => trimmed.some((t) => d === t || d.startsWith(`${t}/`)))
          .map((d) => `${w.path} declares ${d}`),
      );
    expect(
      offenders,
      'These would hit MODULE_NOT_FOUND on a lean shard. The lane derivation ' +
        'in scripts/ci-test-shard.mts should have caught them — if this fails, ' +
        'the derivation and .github/lean-node-modules.txt have diverged.',
    ).toEqual([]);
  });

  it('does not trim date-fns — four node-lane packages import it', () => {
    expect(trimmed).not.toContain('date-fns');
  });
});

describe('the lean archive is actually produced', () => {
  const wf = readFileSync(WORKFLOW, 'utf8');

  // A list nothing reads is not a mechanism. Three archives were measured at
  // ~451 MB while a twelve-entry exclusion list sat in the setup action doing
  // nothing, so "the list exists" is not evidence.
  it('is read by the trim step, which must be the last step of the node lane', () => {
    expect(wf).toContain('.github/lean-node-modules.txt');
    expect(wf).toContain('rm -rf "node_modules/${pkg:?}"');
    const job = wf.slice(
      wf.indexOf('\n  test:\n'),
      wf.indexOf('\n  test-web:\n'),
    );
    const steps = [...job.matchAll(/^ {6}- (?:name: (.*)|uses: (.*))$/gm)];
    expect(steps.at(-1)?.[1] ?? '').toContain('Trim the web tree');
  });

  // Rewriting the lean cache step once spliced out the `npm ci` steps that sat
  // between it and the Turbo block: a missed key restored nothing, installed
  // nothing, and the shard died with `vitest: not found`.
  it('still installs when neither node_modules cache hits', () => {
    const setup = readFileSync(
      join(ROOT, '.github', 'actions', 'setup', 'action.yml'),
      'utf8',
    );
    expect(setup).toContain('npm ci --prefer-offline');
    const install = /- name: Install dependencies\n\s+if: ([^\n]+)/.exec(setup);
    expect(
      install,
      'no `Install dependencies` step in the setup action',
    ).not.toBeNull();
    const condition = (install as RegExpExecArray)[1];
    for (const id of [...setup.matchAll(/id: (node-modules-cache-\w+)/g)].map(
      (m) => m[1],
    ))
      expect(
        condition,
        `\`Install dependencies\` does not consult ${id}, so a miss on that cache ` +
          'would skip `npm ci` and leave the job with no node_modules.',
      ).toContain(id);
  });
});
