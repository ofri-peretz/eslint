/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — every `eslint-plugin-*` name written into a machine-read
 * metadata surface names a package that exists in `packages/`.
 *
 * The bug this generalises: #414 renamed `eslint-plugin-pg` →
 * `eslint-plugin-postgresql-security` and `eslint-plugin-jwt` →
 * `eslint-plugin-jwt-security`. Every *code* reference was updated. Every
 * reference sitting in a config file was not, and each one failed silently
 * rather than loudly, because a config that names a path nobody has is
 * indistinguishable from a config that matched nothing:
 *
 *   - `codecov.yml` carried a flag and a component scoped to
 *     `packages/eslint-plugin-pg/` and `packages/eslint-plugin-jwt/`. Neither
 *     directory had existed for months, so both plugins reported no coverage
 *     at all — while the badge in each README pointed at a `-security`
 *     component id that codecov.yml never defined.
 *   - `.github/workflows/api-surface.yml` listed both dead paths in its
 *     `paths:` filter, so the API-surface gate never fired for the two plugins
 *     it was written to protect.
 *   - `.agent/artifact-size-baseline.json`, `oxlint-portability-baseline.json`
 *     and `api-surface-manifest.json` were each keyed by the dead name, so the
 *     renamed plugin had no baseline and the audits skipped it.
 *   - the ILB-flagship benchmark installed `eslint-plugin-pg@*` and
 *     `eslint-plugin-jwt@*` from npm — the frozen pre-rename publishes — and
 *     scored those instead of what we ship.
 *
 * Prose is deliberately NOT scanned. A CHANGELOG entry, a dated audit and the
 * comment explaining a rename all name the old package correctly, and a lock
 * that forbids saying `eslint-plugin-pg` anywhere would be fought rather than
 * fixed. The line is: if a machine reads the string, it must resolve.
 *
 * Each surface below is asserted non-empty before its contents are checked. A
 * scan that silently found nothing — a moved file, a tightened regex — would
 * otherwise pass exactly as loudly as a clean tree.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');

const PLUGIN_DIRS = new Set(
  readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('eslint-plugin-'))
    .map((e) => e.name),
);

/** Any `eslint-plugin-<name>` token in a string, however it is quoted or pathed. */
const PLUGIN_TOKEN = /eslint-plugin-[a-z0-9]+(?:-[a-z0-9]+)*/g;

function pluginNamesIn(text: string): string[] {
  return [...new Set(text.match(PLUGIN_TOKEN) ?? [])];
}

function read(relPath: string): string {
  return readFileSync(join(REPO_ROOT, relPath), 'utf-8');
}

/**
 * Names that appear in a metadata file and are legitimately not ours: peer
 * plugins the benchmark installs to compare against, and the deprecation
 * shims. Anything else must be a directory under `packages/`.
 */
const THIRD_PARTY = new Set([
  'eslint-plugin-import',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-no-secrets',
  'eslint-plugin-no-unsanitized',
  'eslint-plugin-react-hooks',
  'eslint-plugin-regexp',
  'eslint-plugin-security',
  'eslint-plugin-security-node',
  'eslint-plugin-sonarjs',
  'eslint-plugin-sdl',
  'eslint-plugin-vue',
  'eslint-plugin-n',
  'eslint-plugin-unicorn',
  'eslint-plugin-promise',
]);

function assertResolvable(source: string, names: string[]): void {
  const dead = names.filter((n) => !PLUGIN_DIRS.has(n) && !THIRD_PARTY.has(n));
  expect(dead, `${source} names plugin package(s) with no directory in packages/`).toEqual([]);
}

describe('plugin names in metadata resolve to real packages', () => {
  it('has plugin directories to check against', () => {
    // Guards the whole file: an empty set would make every assertion below vacuous.
    expect(PLUGIN_DIRS.size).toBeGreaterThan(20);
  });

  it('codecov.yml scopes every flag and component to a real package', () => {
    const text = read('codecov.yml');
    const paths = [...text.matchAll(/packages\/(eslint-plugin-[a-z0-9-]+)/g)].map((m) => m[1]);
    expect(paths.length, 'codecov.yml declares no packages/ paths — has the file moved?')
      .toBeGreaterThan(10);
    assertResolvable('codecov.yml', [...new Set(paths)]);
  });

  it('every workflow `paths:` filter points at a real package', () => {
    const workflowsDir = join(REPO_ROOT, '.github/workflows');
    const files = readdirSync(workflowsDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
    expect(files.length, 'no workflow files found').toBeGreaterThan(0);

    let checked = 0;
    for (const file of files) {
      const text = readFileSync(join(workflowsDir, file), 'utf-8');
      const paths = [...new Set([...text.matchAll(/'packages\/(eslint-plugin-[a-z0-9-]+)\/\*\*'/g)].map((m) => m[1]))];
      checked += paths.length;
      assertResolvable(`.github/workflows/${file}`, paths);
    }
    expect(checked, 'no workflow path filters matched — has the quoting style changed?')
      .toBeGreaterThan(0);
  });

  it.each([
    '.agent/artifact-size-baseline.json',
    '.agent/oxlint-portability-baseline.json',
    '.agent/api-surface-manifest.json',
    '.agent/plugin-rule-manifest.json',
  ])('%s is keyed by live package names', (relPath) => {
    const names = pluginNamesIn(read(relPath));
    expect(names.length, `${relPath} mentions no plugin at all`).toBeGreaterThan(0);
    assertResolvable(relPath, names);
  });

  it('the ILB-flagship benchmark installs and scores the packages we ship', () => {
    // The suite resolves our plugins from npm by name. A dead name installs the
    // frozen pre-rename publish and scores it as if it were current — the exact
    // silent-wrong-number failure `benchmarks/__tests__/configs-load.test.ts`
    // documents from the other direction.
    for (const relPath of [
      'benchmarks/suites/ilb-flagship/manifest.json',
      'benchmarks/suites/ilb-flagship/workspace/package.json',
      'benchmarks/suites/ilb-flagship/workspace/eslint.flagship.config.mjs',
    ]) {
      const names = pluginNamesIn(read(relPath));
      expect(names.length, `${relPath} mentions no plugin at all`).toBeGreaterThan(0);
      assertResolvable(relPath, names);
    }
  });

  it('the docs registry lists every package and nothing else', () => {
    // The registry drives the docs nav, the README ecosystem table and the
    // per-plugin doc URLs. A package missing from it is a plugin with no page.
    const text = read('apps/docs/src/lib/plugins.ts');
    const registered = new Set(
      [...text.matchAll(/package:\s*'(eslint-plugin-[a-z0-9-]+)'/g)].map((m) => m[1]),
    );
    expect([...registered].filter((n) => !PLUGIN_DIRS.has(n)), 'registered but not in packages/')
      .toEqual([]);
    expect([...PLUGIN_DIRS].filter((n) => !registered.has(n)), 'in packages/ but not registered')
      .toEqual([]);
  });

  it('every registry slug has a docs directory under its pillar', () => {
    // The README "Getting Started" links and the OG image link are built from
    // `docs/<pillar>/plugin-<slug>`. Both still pointed at `plugin-jwt` and
    // `plugin-pg` after the rename, surviving only on a redirect.
    const text = read('apps/docs/src/lib/plugins.ts');
    const entries = [
      ...text.matchAll(
        /slug:\s*'([a-z0-9-]+)'[\s\S]*?package:\s*'(eslint-plugin-[a-z0-9-]+)'[\s\S]*?pillar:\s*'([a-z]+)'/g,
      ),
    ];
    expect(entries.length, 'registry parsed to zero entries').toBe(PLUGIN_DIRS.size);

    const missing = entries
      .map(([, slug, , pillar]) => `apps/docs/content/docs/${pillar}/plugin-${slug}`)
      .filter((dir) => !existsSync(join(REPO_ROOT, dir)));
    expect(missing, 'registry entries with no docs directory').toEqual([]);
  });

  it('no plugin README links a docs slug that does not exist', () => {
    const dirs: string[] = [];
    for (const pillar of ['security', 'quality']) {
      const base = join(REPO_ROOT, 'apps/docs/content/docs', pillar);
      if (!existsSync(base)) continue;
      for (const e of readdirSync(base, { withFileTypes: true })) {
        if (e.isDirectory() && e.name.startsWith('plugin-')) dirs.push(e.name);
      }
    }
    expect(dirs.length, 'no plugin docs directories found').toBeGreaterThan(20);
    const live = new Set(dirs);

    const offenders: string[] = [];
    for (const pkg of PLUGIN_DIRS) {
      const readmePath = join(PACKAGES_DIR, pkg, 'README.md');
      if (!existsSync(readmePath)) continue;
      const readme = readFileSync(readmePath, 'utf-8');
      for (const m of readme.matchAll(/docs\/(?:security|quality)\/(plugin-[a-z0-9-]+)/g)) {
        if (!live.has(m[1])) offenders.push(`${pkg}/README.md → ${m[1]}`);
      }
    }
    expect(offenders, 'README links to a docs slug with no directory').toEqual([]);
  });
});
