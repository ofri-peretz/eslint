/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace-level lock for `.changeset/*.md` validity.
 *
 * A changeset is hand-written YAML with no schema behind it, and changesets
 * fails **closed on the whole release plan** when one entry is wrong:
 *
 *   🦋  error Found changeset eslint-peer-floor-8-40 for package
 *       eslint-plugin-jwt which is not in the workspace
 *
 * That is not a per-package skip — `changeset version` exits non-zero and
 * bumps nothing at all. On 2026-08-07 two changesets kept naming
 * `eslint-plugin-jwt` / `eslint-plugin-pg` after those packages were removed
 * in the `-security` rename, so the Version Packages PR could not regenerate
 * for two days while 22 changesets piled up behind it. Every merge in that
 * window looked green: `release.yml` compares version-vs-npm, found them
 * equal, and skipped publishing without complaint (#439 fixed the data, this
 * locks the shape).
 *
 * Three things are asserted, all cheap and all from the filesystem:
 *
 *   1. Every package named in a changeset exists in the workspace.
 *   2. Every bump type is one of major/minor/patch.
 *   3. The frontmatter parses at all.
 *
 * Deliberately NOT asserted: that a PR *has* a changeset. That is the
 * advisory in changesets-pr.yml, it is a different question (release intent,
 * not release validity), and it needs a diff against the base branch rather
 * than a filesystem read.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const CHANGESET_DIR = join(ROOT, '.changeset');
const VALID_BUMPS = new Set(['major', 'minor', 'patch']);

/** Every package name declared anywhere in the workspace. */
function workspacePackages(): Set<string> {
  const names = new Set<string>();
  for (const group of ['packages', 'apps', 'tools']) {
    const dir = join(ROOT, group);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      const manifest = join(dir, entry, 'package.json');
      if (!existsSync(manifest)) continue;
      try {
        names.add(JSON.parse(readFileSync(manifest, 'utf8')).name);
      } catch {
        // A malformed manifest is a different test's problem.
      }
    }
  }
  return names;
}

/** `[{ file, pkg, bump }]` for every entry across every changeset. */
function changesetEntries(): { file: string; pkg: string; bump: string }[] {
  if (!existsSync(CHANGESET_DIR)) return [];
  const out: { file: string; pkg: string; bump: string }[] = [];
  for (const file of readdirSync(CHANGESET_DIR)) {
    if (!file.endsWith('.md') || file === 'README.md') continue;
    const source = readFileSync(join(CHANGESET_DIR, file), 'utf8');
    // Frontmatter is the block between the first two `---` lines. Quotes are
    // optional in changesets' own writer, so accept bare, single and double.
    const frontmatter = source.split('---')[1] ?? '';
    for (const [, pkg, bump] of frontmatter.matchAll(
      /^\s*['"]?([^'":\n]+?)['"]?\s*:\s*(\S+)\s*$/gm,
    )) {
      out.push({ file, pkg: pkg!.trim(), bump: bump!.trim() });
    }
  }
  return out;
}

describe('changeset validity', () => {
  it('names only packages that exist in the workspace', () => {
    const real = workspacePackages();
    // Non-vacuity: if the workspace scan breaks, every name would "not exist"
    // and this test would fail loudly rather than pass on an empty set.
    expect(real.size).toBeGreaterThan(20);

    const unknown = changesetEntries()
      .filter((e) => !real.has(e.pkg))
      .map((e) => `${e.file}: "${e.pkg}" is not a workspace package`);

    expect(unknown).toEqual([]);
  });

  it('uses only major/minor/patch bump types', () => {
    const bad = changesetEntries()
      .filter((e) => !VALID_BUMPS.has(e.bump))
      .map((e) => `${e.file}: "${e.pkg}" has bump "${e.bump}"`);

    expect(bad).toEqual([]);
  });

  it('parses frontmatter out of every changeset file', () => {
    if (!existsSync(CHANGESET_DIR)) return;
    const empty: string[] = [];
    for (const file of readdirSync(CHANGESET_DIR)) {
      if (!file.endsWith('.md') || file === 'README.md') continue;
      const source = readFileSync(join(CHANGESET_DIR, file), 'utf8');
      // An empty-frontmatter changeset — literally `---\n---` — is legal and
      // common here: it records a tooling-only change that bumps nothing
      // (lucky-pandas-repeat.md, thick-lilies-nail.md). So the closing `---`
      // may follow the opening one immediately, hence `[\s\S]*` and an
      // optional newline rather than requiring a body.
      //
      // A file with no frontmatter block at all is the real defect: changesets
      // ignores it silently and the intended bump is lost with no error.
      if (!/^---\r?\n[\s\S]*?---/.test(source)) empty.push(file);
    }
    expect(empty).toEqual([]);
  });
});
