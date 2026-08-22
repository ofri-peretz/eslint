/**
 * Regression lock: every `<RemoteReadme plugin="X" />` / `<RemoteChangelog
 * plugin="X" />` in the docs content must name a package that actually exists
 * at `packages/eslint-plugin-X/` with the file it intends to render.
 *
 * Why this exists
 * ───────────────
 * Those components build a raw.githubusercontent.com URL from the `plugin`
 * prop and fetch it at render time against `main`. A wrong prop is invisible
 * locally, invisible in CI, and invisible in the build — it only fails in
 * production, as a 404 inside the page. When `eslint-plugin-jwt` was renamed
 * to `eslint-plugin-jwt-security` (and `-pg` to `-postgresql-security`) the
 * two doc pages kept the old prop and served a broken README to 106 users for
 * six weeks before anyone noticed.
 *
 * This is the "content / data drift" class from CLAUDE.md: the source of
 * truth (the packages directory) and the reference to it (the MDX prop) live
 * far apart and drift silently. Renaming a package now fails here instead of
 * in production.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '../../../..');
const CONTENT_DIR = join(REPO_ROOT, 'apps/docs/content/docs');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');

/** `<RemoteReadme plugin="x" ...>` / `<RemoteChangelog plugin="x" ...>` */
const USAGE = /<Remote(Readme|Changelog)\b[^>]*?plugin="([^"]+)"/g;

function mdxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return mdxFiles(full);
    return entry.endsWith('.mdx') ? [full] : [];
  });
}

interface Usage {
  file: string;
  component: string;
  plugin: string;
}

function collectUsages(): Usage[] {
  return mdxFiles(CONTENT_DIR).flatMap((file) => {
    const source = readFileSync(file, 'utf-8');
    return [...source.matchAll(USAGE)].map(([, component, plugin]) => ({
      file: file.slice(REPO_ROOT.length + 1),
      component,
      plugin,
    }));
  });
}

describe('remote markdown slugs resolve to real packages', () => {
  const usages = collectUsages();

  // Guard against the scan silently finding nothing — an empty scan asserted
  // over an empty array passes just as green as a correct one.
  it('finds remote-markdown usages to check', () => {
    expect(usages.length).toBeGreaterThan(10);
  });

  it.each(usages)(
    '$file → eslint-plugin-$plugin ($component)',
    ({ component, plugin }) => {
      const pkg = join(PACKAGES_DIR, `eslint-plugin-${plugin}`);
      const file = component === 'Readme' ? 'README.md' : 'CHANGELOG.md';

      expect(
        existsSync(pkg),
        `packages/eslint-plugin-${plugin}/ does not exist — the prop is stale or the package was renamed`,
      ).toBe(true);
      expect(
        existsSync(join(pkg, file)),
        `packages/eslint-plugin-${plugin}/${file} does not exist — production will render a 404`,
      ).toBe(true);
    },
  );
});
