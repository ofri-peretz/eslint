/**
 * Regression lock for the generated corpus index (benchmarks/corpus-index.json).
 *
 * The bugs this locks:
 *
 * 1. `applicablePlugins` naming a plugin that does not exist. The index exists
 *    so suites can select "which repos should I run plugin X against"; a stale
 *    or typo'd name silently selects nothing, and a suite that lints zero repos
 *    still reports success. Every name is checked against packages/ on disk.
 *
 * 2. Entries pointing at repos that have since been deleted or renamed. The
 *    corpus is 161 clones on one machine; paths rot. A suite handed a dead path
 *    reports zero findings rather than failing.
 *
 * 3. Field drift. Consumers query these fields with jq; a renamed or dropped
 *    field breaks them silently.
 *
 *   npx vitest run --root benchmarks
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it, expect } from 'vitest';

import {
  applicablePluginsFor,
  parseGitHubSlug,
  stableStringify,
} from '../../scripts/build-corpus-index.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BENCHMARKS = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(BENCHMARKS, '..');
const INDEX_PATH = path.join(BENCHMARKS, 'corpus-index.json');

const REQUIRED_FIELDS = [
  'name',
  'path',
  'remote',
  'defaultBranch',
  'lastCommit',
  'totalFiles',
  'totalLoc',
  'languages',
  'packageManager',
  'hasTypeScript',
  'isMonorepo',
  'frameworks',
  'applicablePlugins',
  'githubSlug',
  'stars',
  'archived',
  'warnings',
] as const;

/** Plugin package names that actually exist under packages/. */
function realPluginNames(): Set<string> {
  const dir = path.join(REPO_ROOT, 'packages');
  const names = new Set<string>();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = path.join(dir, entry.name, 'package.json');
    if (!fs.existsSync(manifest)) continue;
    const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    if (typeof pkg.name === 'string') names.add(pkg.name);
  }
  return names;
}

const indexExists = fs.existsSync(INDEX_PATH);
const index = indexExists
  ? JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'))
  : null;

describe('corpus index: pure helpers', () => {
  it('never emits a plugin name that does not exist on disk', () => {
    const real = realPluginNames();
    const everyFramework = [
      'nest',
      'express',
      'react',
      'next',
      'lambda',
      'mongodb',
      'vercel-ai',
      'postgresql',
      'jwt',
      'drizzle',
      'knex',
      'mysql',
      'prisma',
      'sequelize',
      'sqlite',
      'typeorm',
      'openai',
      'gemini',
      'anthropic',
      'mcp-sdk',
    ];
    const emitted = new Set(
      everyFramework.flatMap((fw) =>
        applicablePluginsFor([fw], { '.ts': { files: 1, loc: 1 } }),
      ),
    );
    expect(emitted.size).toBeGreaterThan(0);
    expect([...emitted].filter((n) => !real.has(n))).toEqual([]);
  });

  it('assigns no plugins to a repo with no JS/TS', () => {
    expect(
      applicablePluginsFor(['nest'], { '.md': { files: 9, loc: 99 } }),
    ).toEqual([]);
  });

  it('parses every remote URL shape, and rejects non-GitHub hosts', () => {
    expect(parseGitHubSlug('git@github.com:facebook/react.git')).toBe(
      'facebook/react',
    );
    expect(parseGitHubSlug('https://github.com/vercel/next.js')).toBe(
      'vercel/next.js',
    );
    expect(parseGitHubSlug('https://gitlab.com/x/y.git')).toBeNull();
    expect(parseGitHubSlug(null)).toBeNull();
  });

  it('serializes deterministically regardless of key insertion order', () => {
    expect(stableStringify({ b: 1, a: { z: 1, y: 2 } })).toBe(
      stableStringify({ a: { y: 2, z: 1 }, b: 1 }),
    );
  });
});

describe.skipIf(!indexExists)('corpus index: generated artifact', () => {
  it('has the documented top-level shape', () => {
    expect(typeof index.corpusRoot).toBe('string');
    expect(index.repoCount).toBe(index.repos.length);
    expect(index.repos.length).toBeGreaterThan(0);
  });

  it('gives every entry all required fields', () => {
    const missing = index.repos.flatMap((r: Record<string, unknown>) =>
      REQUIRED_FIELDS.filter((f) => !(f in r)).map((f) => `${r.name}.${f}`),
    );
    expect(missing).toEqual([]);
  });

  it('names only plugins that exist on disk', () => {
    const real = realPluginNames();
    const bogus = [
      ...new Set(
        index.repos.flatMap(
          (r: { applicablePlugins: string[] }) => r.applicablePlugins,
        ),
      ),
    ].filter((n) => !real.has(n as string));
    expect(bogus).toEqual([]);
  });

  it('points every entry at a path that still exists', () => {
    const dead = index.repos
      .filter((r: { path: string }) => !fs.existsSync(r.path))
      .map((r: { name: string }) => r.name);
    expect(dead).toEqual([]);
  });

  it('never reports a silent zero', () => {
    // A repo that counted nothing and said nothing about it is indistinguishable
    // from a repo the walk never reached. `oos/tinymce` is 15 MB on disk with an
    // empty git index, and the first run indexed it as 0 files / 0 LOC / no
    // frameworks / no applicable plugins, with an empty `warnings` array. Every
    // zero has to be accounted for.
    const unexplained = index.repos
      .filter(
        (r: { totalFiles: number; warnings?: string[] }) =>
          r.totalFiles === 0 && (r.warnings ?? []).length === 0,
      )
      .map((r: { name: string }) => r.name);
    expect(unexplained).toEqual([]);
  });

  it('is sorted by name, so re-runs diff cleanly', () => {
    const names = index.repos.map((r: { name: string }) => r.name);
    expect(names).toEqual([...names].sort());
  });
});
