/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 *
 * @provenBy {"file":"packages/eslint-formatter-sarif/package.json","find":"    \"build\": \"tsx ../../scripts/build-package.ts\",\n","replace":""}
 * @provenBy {"file":"packages/eslint-formatter-sarif/package.json","find":"    \"src\",\n","replace":""}
 */

/**
 * A published entry point must be something the package actually produces.
 *
 * Twice now a package has declared `main: ./dist/src/index.*` with no `build`
 * script to produce it. `@interlace/eslint-formatter` and
 * `@interlace/eslint-formatter-sarif` both sat that way; #105 hid the symptom
 * by marking them private, and the sarif README kept telling users to
 * `npm install` a package that 404s. Nothing in CI objected, because every
 * artifact gate runs on a built dist/ — and a package that cannot build has no
 * dist/ to inspect.
 *
 * So this reads the SOURCE manifest, before any build, and asks the two
 * questions a consumer's `require()` will ask of the tarball:
 *
 *   is the path produced?   under `dist/` there must be a `build` script;
 *                           anywhere else the file must already exist
 *   is the path shipped?    it must sit inside `files` — npm publishes nothing
 *                           outside that list, whatever `main` says
 *
 * `./dist/` is stripped before the `files` check because build-package.ts
 * strips it on publish: the tarball root IS dist/.
 *
 * Scoped to packages release.yml would publish. A private package with a
 * dangling `main` reaches nobody, and the codecov lock already insists that
 * private ones stay out of the consumer-facing number.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const PACKAGES = join(ROOT, 'packages');

type Manifest = {
  name: string;
  private?: boolean;
  main?: string;
  types?: string;
  exports?: unknown;
  files?: string[];
  scripts?: Record<string, string>;
};

function publishedPackages(): { dir: string; pkg: Manifest }[] {
  const out: { dir: string; pkg: Manifest }[] = [];
  for (const e of readdirSync(PACKAGES, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    const manifest = join(PACKAGES, e.name, 'package.json');
    if (!existsSync(manifest)) continue;
    const pkg = JSON.parse(readFileSync(manifest, 'utf8')) as Manifest;
    if (pkg.private !== true) out.push({ dir: e.name, pkg });
  }
  return out;
}

/** `main`, `types`, and every string leaf of `exports`. Wildcards are skipped. */
function entryPoints(pkg: Manifest): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') out.push(node);
    else if (node && typeof node === 'object')
      for (const v of Object.values(node as Record<string, unknown>)) walk(v);
  };
  walk(pkg.main);
  walk(pkg.types);
  walk(pkg.exports);
  return [...new Set(out)].filter((p) => !p.includes('*'));
}

/** The path as it lands in the tarball — build-package.ts strips `./dist/`. */
const asPublished = (p: string): string =>
  p.replace(/^\.\/dist\//, './').replace(/^\.\//, '');

/** npm includes these whatever `files` says; four packages export `./package.json`. */
const ALWAYS_SHIPPED = new Set(['package.json', 'README.md', 'LICENSE']);

/** `dist/` entries are no-ops in the published manifest and are dropped there. */
function shippedBy(files: string[] | undefined, rel: string): boolean {
  if (!files) return true; // no allowlist: npm ships everything not ignored
  if (ALWAYS_SHIPPED.has(rel)) return true;
  return files
    .map((f) => f.replace(/^\.\//, '').replace(/\/$/, ''))
    .filter((f) => f !== 'dist')
    .some((f) => rel === f || rel.startsWith(`${f}/`));
}

describe('a published entry point is produced and shipped', () => {
  const published = publishedPackages();

  it('sees the published packages', () => {
    expect(
      published.length,
      'fewer than 20 published packages found — this lock would pass vacuously',
    ).toBeGreaterThan(20);
  });

  it('every entry point under dist/ has a build script to produce it', () => {
    const offenders = published
      .filter(({ pkg }) => typeof pkg.scripts?.build !== 'string')
      .flatMap(({ pkg }) =>
        entryPoints(pkg)
          .filter((p) => p.startsWith('./dist/'))
          .map((p) => `${pkg.name}: ${p}`),
      );
    expect(
      offenders,
      'These packages point an entry at dist/ but have no `build` script, so ' +
        'nothing ever produces the file. release.yml publishes from dist/ — ' +
        'this is the shape #105 had to hide behind `private: true`. Add a ' +
        '`build` (scripts/build-package.ts handles plain-JS packages too), ' +
        'or point the entry at the shipped source.',
    ).toEqual([]);
  });

  it('every entry point outside dist/ exists when nothing builds it', () => {
    const offenders = published
      .filter(({ pkg }) => typeof pkg.scripts?.build !== 'string')
      .flatMap(({ dir, pkg }) =>
        entryPoints(pkg)
          .filter((p) => !p.startsWith('./dist/'))
          .filter((p) => !existsSync(join(PACKAGES, dir, p)))
          .map((p) => `${pkg.name}: ${p}`),
      );
    expect(
      offenders,
      'A package with no `build` ships its source as-is, so every entry point ' +
        'must already be on disk. These are not.',
    ).toEqual([]);
  });

  it('every entry point sits inside `files`, so npm actually ships it', () => {
    const offenders = published.flatMap(({ pkg }) =>
      entryPoints(pkg)
        .map(asPublished)
        .filter((rel) => !shippedBy(pkg.files, rel))
        .map((rel) => `${pkg.name}: ${rel}`),
    );
    expect(
      offenders,
      'npm publishes only what `files` lists. These entry points resolve to a ' +
        'path outside it, so the tarball installs and then fails to load.',
    ).toEqual([]);
  });
});
