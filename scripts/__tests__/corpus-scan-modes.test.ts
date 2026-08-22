/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The two scan modes must stay distinguishable.
 *
 * The default installs the PUBLISHED plugins and its numbers describe what a
 * consumer gets. `--local` installs the working tree and its numbers describe
 * what is about to ship. Confusing the two is how an unreleased fix takes
 * credit for a number nobody can see, so three properties are pinned here.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  path.join(import.meta.dirname, '..', 'corpus-scan.ts'),
  'utf-8',
);

describe('corpus-scan modes', () => {
  it('refuses --local --update, so a working-tree run cannot rewrite the budget', () => {
    expect(SOURCE).toContain('--local --update is refused');
    // The refusal has to come before any scanning work, not after.
    const refusal = SOURCE.indexOf('--local --update is refused');
    const install = SOURCE.indexOf('Installing scan rig');
    expect(refusal).toBeGreaterThan(-1);
    expect(refusal).toBeLessThan(install);
  });

  it('labels every run with which plugins it measured', () => {
    expect(SOURCE).toContain('LOCAL WORKING TREE (not shipped behaviour)');
    expect(SOURCE).toContain('published plugin versions');
  });

  it('hashes dist CONTENTS in local mode, not metadata and not one entry point', () => {
    // `dist/src/index.js` is a barrel and contains no rule code, so editing a
    // rule leaves it byte-identical. A fingerprint reading only that file — or
    // reading mtime, which is metadata and does not identify bytes — calls the
    // rig fresh while npm serves the previous build from cache.
    expect(SOURCE).toContain('function distHash');
    expect(SOURCE).toContain("createHash('sha1')");
    expect(SOURCE).not.toMatch(/mtimeMs/);
    // Path as well as contents, so a moved file counts as a change.
    expect(SOURCE).toContain('path.relative(dist, full)');
    // LENGTH-DELIMITED. Concatenating path and contents without boundaries
    // lets a file named `a` holding `a` hash identically to a file named `aa`
    // holding nothing — both e0c9035898dd52fc before this was fixed.
    expect(SOURCE).toContain('writeUInt32BE(relative.byteLength, 0)');
    expect(SOURCE).toContain('writeUInt32BE(contents.byteLength, 4)');
  });

  it('fingerprints the BUILT artifact in local mode, not the version', () => {
    // A version string does not change when you rebuild, so in local mode it
    // cannot identify the code — npm would serve the previous build from cache
    // and the run would silently measure something else. This exact bug cost a
    // day: no-magic-numbers read 1,635 against a fresh 1,421.
    expect(SOURCE).toMatch(/local \? `\$\{plugin\}:local:\$\{distHash\(plugin\)\}`/);
    expect(SOURCE).toContain('`${plugin}@${publishedVersion(plugin)}`');
  });

  it('installs the devkit FROM THE WORKING TREE in local mode', () => {
    // Without this, `--local` did not measure the local tree. Every plugin
    // declares `@interlace/eslint-devkit` as a semver RANGE, so npm resolved it
    // from the registry and the rig ran local plugins against the PUBLISHED
    // devkit. Everything living there — isTestFilePath, createRule's skip
    // flags, every shared detector — was measured at the last release while the
    // report said "local working tree".
    //
    // Measured after the fix: react-features/hooks-exhaustive-deps reads 84,
    // not 91. That number had disagreed with itself across runs for a day and
    // the mechanism was recorded as unknown. It was this.
    expect(SOURCE).toContain('@interlace/eslint-devkit@file:');
    // The devkit's dist, NOT its package root. A plugin's `files` lists both
    // `src/` and `dist/`; the devkit's lists only `src/` while its `main` is
    // `./dist/src/index.js`, so packing its root yields a tarball whose entry
    // point is not in it. It is published FROM `dist/`.
    expect(SOURCE).toMatch(/'eslint-devkit', 'dist'/);
  });

  it('includes the devkit in the local fingerprint', () => {
    // Hashing only the plugins left a devkit-only change stamped as unchanged,
    // so the rig kept its stale copy. Adding an export made it loud; changing
    // an existing one is silent.
    expect(SOURCE).toContain("`eslint-devkit:local:${distHash('eslint-devkit')}`");
  });

  it('gives the rig a private npm cache and drops it on rebuild', () => {
    // `--install-links` packs each file: dependency into a tarball npm caches
    // under name@version, and a rebuild does not bump the version — so the
    // shared cache serves the previous build. Scoped to the rig so wiping it
    // cannot touch the developer's own.
    expect(SOURCE).toContain('const NPM_CACHE');
    expect(SOURCE).toContain('rmSync(NPM_CACHE');
    expect(SOURCE).toMatch(/'--cache',\s*\n?\s*NPM_CACHE/);
  });
});
