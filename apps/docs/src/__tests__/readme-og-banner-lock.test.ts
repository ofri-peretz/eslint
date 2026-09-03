import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regression lock: every published package README's brand banner must point at
 * an OG image that actually exists in apps/docs/public/images/.
 *
 * This is the drift that shipped a broken banner before: the README URL and the
 * generated filename are produced by two different files (the README footer in
 * tools/scripts/fix-readmes.ts, the PNG in apps/docs/scripts/generate-og-images.mjs),
 * so a slug rename in either one silently 404s on npm — where the README is
 * baked at publish time and can only be fixed by republishing.
 */

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
const IMAGES_DIR = path.join(REPO_ROOT, 'apps/docs/public/images');

const DOCS_ORIGIN = 'https://eslint.interlace.tools';
const BANNER_RE = new RegExp(`${DOCS_ORIGIN}/images/(og-[a-z0-9-]+\\.png)`, 'g');

/** Published packages only — private workspaces never reach an npm README. */
function publishedPackages() {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ dir: e.name, root: path.join(PACKAGES_DIR, e.name) }))
    .filter(({ root }) => existsSync(path.join(root, 'package.json')))
    .map((p) => ({
      ...p,
      pkg: JSON.parse(readFileSync(path.join(p.root, 'package.json'), 'utf8')) as {
        name: string;
        private?: boolean;
      },
    }))
    .filter(({ pkg }) => pkg.private !== true);
}

describe('published README OG banners', () => {
  const published = publishedPackages();

  it('finds the published packages (guards against a broken glob)', () => {
    expect(published.length).toBeGreaterThan(0);
  });

  it.each(published)('$pkg.name banner image exists on disk', ({ root, pkg }) => {
    const readmePath = path.join(root, 'README.md');
    expect(existsSync(readmePath), `${pkg.name} has no README.md`).toBe(true);

    const readme = readFileSync(readmePath, 'utf8');
    const files = [...readme.matchAll(BANNER_RE)].map((m) => m[1]);

    // Every published package carries exactly one banner. A package with zero
    // is the regression this lock exists to catch (eslint-devkit had none).
    expect(files, `${pkg.name} README has no OG banner`).toHaveLength(1);
    expect(
      existsSync(path.join(IMAGES_DIR, files[0])),
      `${pkg.name} banner references ${files[0]}, which is not in apps/docs/public/images/`,
    ).toBe(true);
  });
});
