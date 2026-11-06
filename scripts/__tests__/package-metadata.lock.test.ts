/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — every published package's source manifest carries the
 * metadata npm, the registry page and supply-chain scanners read.
 *
 * `check-published-artifacts.ts` asserts a subset on the BUILT manifest, so
 * it only runs after a build and only in CI. This reads `packages/<dir>/
 * package.json` directly, so a missing field fails `test:scripts` before any
 * build.
 *
 * Two fields are asserted ABSENT:
 *   - `funding`. Every package carried `funding: { type: "github", url:
 *     "<this repo>" }`. That is not a funding page, and npm's `npm fund` sent
 *     people to the source tree. There is no Sponsors listing to point at.
 *   - `publishConfig.provenance`. release.yml publishes with `--provenance`
 *     under OIDC; in the manifest it would make an emergency local publish
 *     fail (see check-published-artifacts.ts).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..', '..');
const PACKAGES = join(ROOT, 'packages');
const AUTHOR = 'Ofri Peretz <ofriperetzdev@gmail.com>';

type Conditions = string | { [condition: string]: Conditions };
type Manifest = {
  name?: string;
  version?: string;
  private?: boolean;
  description?: string;
  keywords?: string[];
  license?: string;
  author?: string;
  repository?: { type?: string; url?: string; directory?: string };
  bugs?: { url?: string };
  homepage?: string;
  engines?: { node?: string };
  type?: string;
  exports?: Record<string, Conditions>;
  files?: string[];
  sideEffects?: boolean | string[];
  publishConfig?: { access?: string; provenance?: boolean };
  funding?: unknown;
};

const published = readdirSync(PACKAGES)
  .filter((dir) => existsSync(join(PACKAGES, dir, 'package.json')))
  .map((dir) => ({
    dir,
    pkg: JSON.parse(
      readFileSync(join(PACKAGES, dir, 'package.json'), 'utf8'),
    ) as Manifest,
  }))
  .filter(({ pkg }) => pkg.private !== true);

/** Every condition object in an exports map whose targets include a `.d.ts`. */
function typedConditions(value: Conditions): Record<string, Conditions>[] {
  if (typeof value === 'string') return [];
  const nested = Object.values(value).flatMap(typedConditions);
  const typed = Object.values(value).some(
    (v) => typeof v === 'string' && v.endsWith('.d.ts'),
  );
  return typed ? [value, ...nested] : nested;
}

describe('every published package carries complete npm metadata', () => {
  it('finds the published packages to check', () => {
    expect(published.length).toBeGreaterThan(30);
  });

  it.each(published)('$pkg.name', ({ dir, pkg }) => {
    expect(pkg.name, 'name').toBeTruthy();
    expect(pkg.version, 'version').toMatch(/^\d+\.\d+\.\d+/);
    expect(pkg.description?.trim(), 'description').toBeTruthy();
    expect(pkg.keywords?.length ?? 0, 'keywords').toBeGreaterThan(0);
    expect(pkg.license, 'license').toBe('MIT');
    expect(existsSync(join(PACKAGES, dir, 'LICENSE')), 'LICENSE file').toBe(
      true,
    );
    expect(pkg.author, 'author').toBe(AUTHOR);
    expect(pkg.repository, 'repository').toEqual({
      type: 'git',
      url: 'git+https://github.com/ofri-peretz/eslint.git',
      directory: `packages/${dir}`,
    });
    expect(pkg.bugs?.url, 'bugs.url').toBe(
      'https://github.com/ofri-peretz/eslint/issues',
    );
    expect(pkg.homepage, 'homepage').toMatch(/^https:\/\//);
    expect(pkg.engines?.node, 'engines.node').toBeTruthy();
    expect(['module', 'commonjs'], 'type').toContain(pkg.type);
    expect(pkg.exports?.['.'], 'exports["."]').toBeDefined();
    expect(pkg.files?.length ?? 0, 'files allowlist').toBeGreaterThan(0);
    expect(pkg.sideEffects, 'sideEffects').toBeDefined();
    expect(pkg.publishConfig?.access, 'publishConfig.access').toBe('public');
    expect(pkg.publishConfig?.provenance, 'provenance stays a CLI flag').toBe(
      undefined,
    );
    expect(pkg.funding, 'funding points at no funding page').toBeUndefined();
    for (const conditions of Object.values(pkg.exports ?? {}).flatMap(
      typedConditions,
    ))
      expect(Object.keys(conditions)[0], 'types is the first condition').toBe(
        'types',
      );
  });
});
