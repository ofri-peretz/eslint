/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — every published README points at every plugin.
 *
 * The ecosystem table is the only cross-link a reader who landed on one npm page gets
 * to the other thirty. It is generated from the registry, so a plugin added to the
 * registry propagates on the next `sync-readmes` — but nothing asserted that the sync
 * had actually been run, and nothing looked at published packages that are not
 * plugins at all.
 *
 * That second gap is why this file exists. `tools/scripts/check-readme-structure.ts`
 * filters to `eslint-plugin-*`, so `@interlace/eslint-devkit` — on npm, and the
 * package the thirty are built with — carried no ecosystem table for its whole life
 * and every check stayed green. A gate that only inspects the members of a set cannot
 * report the thing outside it.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');

const START = '<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:START - Do not edit manually -->';
const END = '<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:END -->';

interface Pkg {
  dir: string;
  name: string;
  readme: string;
}

/** Published packages only — a `private` package must not advertise itself on npm. */
function publishedPackages(): Pkg[] {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap((e) => {
      const manifest = join(PACKAGES_DIR, e.name, 'package.json');
      const readmePath = join(PACKAGES_DIR, e.name, 'README.md');
      if (!existsSync(manifest) || !existsSync(readmePath)) return [];
      const pkg = JSON.parse(readFileSync(manifest, 'utf-8'));
      if (pkg.private) return [];
      return [{ dir: e.name, name: pkg.name as string, readme: readFileSync(readmePath, 'utf-8') }];
    })
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

const PUBLISHED = publishedPackages();
const ALL_PLUGINS = PUBLISHED.filter((p) => p.dir.startsWith('eslint-plugin-')).map((p) => p.dir);

/** The plugin names actually linked from a README's generated table. */
function linkedPlugins(readme: string): string[] {
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start === -1 || end === -1) return [];
  return [
    ...new Set(
      Array.from(
        readme.slice(start, end).matchAll(/^\| \[`(eslint-plugin-[a-z0-9-]+)`\]/gm),
        (m) => m[1],
      ),
    ),
  ].sort();
}

describe('ecosystem table completeness', () => {
  it('finds the plugins it is meant to be checking', () => {
    expect(ALL_PLUGINS.length).toBeGreaterThan(20);
  });

  it.each(PUBLISHED.map((p) => [p.dir, p] as const))(
    '%s links every other published plugin',
    (dir, pkg) => {
      expect(
        pkg.readme.includes(START) && pkg.readme.includes(END),
        `${dir}/README.md has no generated ecosystem table — run \`npm run sync-readmes\`. ` +
          'Every published package cross-links the ecosystem, plugin or not.',
      ).toBe(true);

      // A plugin excludes itself; a non-plugin excludes nothing, since it is not one
      // of the thirty.
      const expected = ALL_PLUGINS.filter((p) => p !== dir).sort();
      expect(
        linkedPlugins(pkg.readme),
        `${dir}/README.md's ecosystem table is stale — run \`npm run sync-readmes\``,
      ).toEqual(expected);
    },
  );

  it('never links a package to itself', () => {
    for (const pkg of PUBLISHED) {
      expect(linkedPlugins(pkg.readme), `${pkg.dir} lists itself`).not.toContain(pkg.dir);
    }
  });
});
