/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — every published README carries its install-size badge.
 *
 * The prelude badge row is hand-written, not generated, which is how two retired
 * package names survived a rename in prose nobody owned. A badge added by hand to
 * thirty-one files drifts the same way: the next new plugin is created from a
 * template, someone forgets, and one npm page quietly ships without it.
 *
 * Install size, not bundle size, is deliberate. `bundlephobia` measures a browser
 * bundle, and nobody bundles an ESLint plugin into one — the number would describe
 * no real cost. `packagephobia`'s install size is what a dev-dependency actually
 * charges you. (Bundlephobia was also returning `429` for every package, `react`
 * included, when this was added — badgen and shields.io both reported the same
 * upstream failure.)
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');

/** Published packages only — a private package ships no README to npm. */
function published(): { dir: string; name: string; text: string }[] {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap((e) => {
      const manifest = join(PACKAGES_DIR, e.name, 'package.json');
      const readme = join(PACKAGES_DIR, e.name, 'README.md');
      if (!existsSync(manifest) || !existsSync(readme)) return [];
      const pkg = JSON.parse(readFileSync(manifest, 'utf-8'));
      if (pkg.private) return [];
      return [{ dir: e.name, name: pkg.name as string, text: readFileSync(readme, 'utf-8') }];
    })
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

const PUBLISHED = published();

describe('install-size badge', () => {
  it('found the READMEs it is meant to be checking', () => {
    // Guards the guard: an empty list would make every assertion below vacuous.
    expect(PUBLISHED.length).toBeGreaterThan(20);
  });

  it.each(PUBLISHED.map((p) => [p.dir, p] as const))(
    '%s badges its own install size',
    (dir, pkg) => {
      // The package name must match, not merely be present — a badge copied from a
      // sibling README renders that sibling's size, which is worse than no badge
      // because it looks right.
      expect(
        pkg.text,
        `${dir}/README.md has no install-size badge for \`${pkg.name}\``,
      ).toContain(`https://badgen.net/packagephobia/install/${pkg.name}`);

      expect(
        pkg.text,
        `${dir}/README.md's install-size badge does not link to its own packagephobia page`,
      ).toContain(`https://packagephobia.com/result?p=${pkg.name}`);
    },
  );

  it('nobody reintroduces bundlephobia, which is rate-limited upstream', () => {
    // Not style policing: the badge renders the literal text `429` on every npm
    // page that carries it. If it recovers, delete this assertion deliberately.
    const offenders = PUBLISHED.filter((p) => p.text.includes('bundlephobia')).map((p) => p.dir);
    expect(offenders).toEqual([]);
  });
});
