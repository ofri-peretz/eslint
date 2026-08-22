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
    expect(SOURCE).toContain('hash.update(path.relative(dist, full))');
  });

  it('fingerprints the BUILT artifact in local mode, not the version', () => {
    // A version string does not change when you rebuild, so in local mode it
    // cannot identify the code — npm would serve the previous build from cache
    // and the run would silently measure something else. This exact bug cost a
    // day: no-magic-numbers read 1,635 against a fresh 1,421.
    expect(SOURCE).toMatch(/local \? `\$\{plugin\}:local:\$\{distHash\(plugin\)\}`/);
    expect(SOURCE).toContain('`${plugin}@${publishedVersion(plugin)}`');
  });
});
