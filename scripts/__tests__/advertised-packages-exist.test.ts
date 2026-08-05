/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — every install command hardcoded into the docs site names a
 * package we actually publish.
 *
 * The bug this generalises: `apps/docs/src/components/stats/cta.tsx` shipped a
 * copy-to-clipboard button for `npm i -D eslint-config-interlace`, rendered
 * twice on the live /scorecard page under "Convinced? Add the flagship
 * config." That name 404s on npm. The package behind it existed in the
 * workspace but was `private: true` and was never published under that name —
 * so the storefront's closing call-to-action handed every visitor a command
 * that installs nothing.
 *
 * Nothing caught it because both halves looked locally correct: the workspace
 * directory `packages/eslint-config-interlace/` existed, and the scorecard
 * lock asserted the CTA *rendered*, never that its payload was real.
 *
 * Only string literals are checked. Commands assembled from a variable (the
 * per-plugin `InstallCell`, which interpolates a package name read from the
 * generated plugin list) carry no literal to verify and are covered by the
 * generator's own locks instead.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
// Both surfaces a reader can copy from: the React components that render the
// marketing pages, and the 500+ MDX guides.
const DOCS_DIRS = [
  join(REPO_ROOT, 'apps/docs/src'),
  join(REPO_ROOT, 'apps/docs/content'),
];

/** Every workspace package name → whether it is publishable. */
const workspacePackages = new Map<string, { dir: string; private: boolean }>();
for (const dir of readdirSync(PACKAGES_DIR)) {
  const manifest = join(PACKAGES_DIR, dir, 'package.json');
  if (!existsSync(manifest)) continue;
  const pkg = JSON.parse(readFileSync(manifest, 'utf8')) as {
    name?: string;
    private?: boolean;
  };
  if (pkg.name) {
    workspacePackages.set(pkg.name, { dir, private: pkg.private === true });
  }
}

/**
 * Shipped source only. Tests are excluded because they legitimately name
 * packages they assert the *absence* of — the scorecard lock quotes the
 * removed `npm i -D eslint-config-interlace` command in the comment
 * explaining why it must never return, and scanning it would make this lock
 * fail on the very assertion that documents the bug.
 */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      return entry === '__tests__' ? [] : sourceFiles(full);
    }
    if (/\.(test|spec)\.tsx?$/.test(entry)) return [];
    return /\.(ts|tsx|mdx)$/.test(entry) && !entry.endsWith('.d.ts')
      ? [full]
      : [];
  });
}

// `npm i -D pkg` / `npm install --save-dev pkg`. Stops at the first character
// that can't be part of a package name, so a trailing `${...}` or quote ends
// the match instead of being swallowed into it.
const INSTALL_COMMAND = /npm\s+(?:i|install)\s+(?:-D\s+|--save-dev\s+)?(@?[a-z0-9][a-z0-9._/-]*)/g;

/**
 * Ours to publish. Third-party installs the guides legitimately recommend
 * (`eslint`, `eslint-config-prettier`, `typescript-eslint`) are not ours to
 * vouch for, so the `eslint-` prefix alone is too broad — it has to be an
 * Interlace scope, one of our plugins, or carry the brand in its name (which
 * is what `eslint-config-interlace` did).
 */
const isOurs = (name: string): boolean =>
  name.startsWith('@interlace/') ||
  name.startsWith('eslint-plugin-') ||
  name.includes('interlace');

describe('docs site advertises only publishable packages', () => {
  const advertised = DOCS_DIRS.flatMap(sourceFiles).flatMap((file) => {
    const content = readFileSync(file, 'utf8');
    return [...content.matchAll(INSTALL_COMMAND)]
      .map((m) => m[1]!)
      .filter(isOurs)
      .map((name) => ({ file: file.slice(REPO_ROOT.length + 1), name }));
  });

  it('finds install commands to check (guards against a vacuous pass)', () => {
    // If the docs stop hardcoding any install command this lock is inert, and
    // a silent zero-case pass would hide that. Fail loudly instead.
    expect(advertised.length).toBeGreaterThan(0);
  });

  it.each(advertised)('$file advertises $name, which we publish', ({ name }) => {
    const pkg = workspacePackages.get(name);
    expect(
      pkg,
      `\`npm i ${name}\` is advertised but no workspace package is named that. ` +
        `Either the name is wrong or the package was removed.`,
    ).toBeDefined();
    expect(
      pkg!.private,
      `\`npm i ${name}\` is advertised but packages/${pkg!.dir} is ` +
        `private: true — it is never published, so the command installs nothing.`,
    ).toBe(false);
  });
});
