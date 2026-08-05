/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — every `peerDependenciesMeta` entry has a matching
 * `peerDependencies` entry.
 *
 * npm silently drops any `peerDependenciesMeta` key with no twin in
 * `peerDependencies`. A package that declares only the meta half therefore
 * declares *no SDK peer at all*: consumers on an unsupported major get no
 * warning, and the manifest reads as if the constraint were enforced.
 *
 * This is a silent-failure class, which is why it needs a lock rather than
 * review attention. It reached 12 published packages twice — the second time
 * after a fix had already been written, because that fix lived on a branch
 * that never merged and nothing failed in its absence.
 *
 * If this test fails, do not delete the meta entry to make it pass. Add the
 * real supported range to `peerDependencies`; the meta entry is what keeps the
 * peer optional.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PACKAGES_DIR = resolve(__dirname, '../..');

interface Manifest {
  name?: string;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

/** Every workspace package manifest under `packages/`. */
function readManifests(): { dir: string; manifest: Manifest }[] {
  return readdirSync(PACKAGES_DIR)
    .map((dir) => ({ dir, path: join(PACKAGES_DIR, dir, 'package.json') }))
    .filter(({ path }) => existsSync(path))
    .map(({ dir, path }) => ({
      dir,
      manifest: JSON.parse(readFileSync(path, 'utf8')) as Manifest,
    }));
}

/** `dir → orphaned meta keys` for every package with at least one orphan. */
export function findOrphanedPeerMeta(
  manifests: { dir: string; manifest: Manifest }[],
): Record<string, string[]> {
  const orphans: Record<string, string[]> = {};
  for (const { dir, manifest } of manifests) {
    const meta = Object.keys(manifest.peerDependenciesMeta ?? {});
    const declared = manifest.peerDependencies ?? {};
    const missing = meta.filter((name) => declared[name] === undefined);
    if (missing.length > 0) orphans[dir] = missing;
  }
  return orphans;
}

describe('peer declaration integrity', () => {
  it('every peerDependenciesMeta entry has a matching peerDependencies entry', () => {
    // Empty object rather than a count, so a failure names the packages and
    // the exact keys instead of just reporting a number.
    expect(findOrphanedPeerMeta(readManifests())).toEqual({});
  });

  it('detects an orphaned meta entry', () => {
    const orphans = findOrphanedPeerMeta([
      {
        dir: 'eslint-plugin-example',
        manifest: {
          peerDependencies: { eslint: '^9.0.0' },
          peerDependenciesMeta: { 'some-sdk': { optional: true } },
        },
      },
    ]);
    expect(orphans).toEqual({ 'eslint-plugin-example': ['some-sdk'] });
  });

  it('accepts a fully declared optional peer', () => {
    const orphans = findOrphanedPeerMeta([
      {
        dir: 'eslint-plugin-example',
        manifest: {
          peerDependencies: { eslint: '^9.0.0', 'some-sdk': '^1.0.0' },
          peerDependenciesMeta: { 'some-sdk': { optional: true } },
        },
      },
    ]);
    expect(orphans).toEqual({});
  });

  it('ignores packages that declare no peers at all', () => {
    expect(findOrphanedPeerMeta([{ dir: 'tool', manifest: {} }])).toEqual({});
  });
});
