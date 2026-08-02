/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace-level lock for the "dual-linter" claim.
 *
 * Every published `eslint-plugin-*` package claims an `./oxlint` sub-export
 * (wired by scripts/generate-oxlint-shims.ts). Before that claim is marketed
 * anywhere, this lock asserts — for EVERY package under
 * `packages/eslint-plugin-*`, enumerated dynamically so new plugins are
 * covered automatically:
 *
 *   (a) package.json declares the `./oxlint` subpath export with the exact
 *       shape the generator writes ({ types, default } → src/oxlint.*),
 *   (b) the oxlint entry module actually loads (src/oxlint.ts resolves and
 *       its transitive imports — index.ts, every rule, devkit — evaluate), and
 *   (c) it exports a non-empty rule mapping where every entry looks like an
 *       ESLint rule (`create` function), which is what oxlint's JS-plugin
 *       loader reads off `module.exports.rules`.
 *
 * Complements (does not replace) the per-plugin src/oxlint.test.ts smoke
 * tests (present in a subset of packages) and the built-shim runtime check
 * in scripts/verify-oxlint-shims.ts: this lock covers the *published
 * package surface* (exports map + source entry), all plugins, one place.
 *
 * Run from the repo root:
 *   npx vitest run --config scripts/__tests__/vitest.config.mts scripts/__tests__/oxlint-export-lock.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PACKAGES_DIR = path.resolve(__dirname, '..', '..', 'packages');

const pluginDirs = fs
  .readdirSync(PACKAGES_DIR)
  .filter((name) => name.startsWith('eslint-plugin-'))
  .filter((name) => fs.statSync(path.join(PACKAGES_DIR, name)).isDirectory())
  .sort();

it('enumerates the eslint-plugin-* packages (sanity floor)', () => {
  // Ratchet floor, not an exact pin: adding a plugin must not break the
  // lock, deleting plugins without touching this file should.
  expect(pluginDirs.length).toBeGreaterThanOrEqual(19);
});

describe.each(pluginDirs)('%s ./oxlint sub-export', (pkgName) => {
  const pkgDir = path.join(PACKAGES_DIR, pkgName);

  it('declares the ./oxlint export in package.json (types + default)', () => {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'),
    ) as {
      exports?: Record<string, unknown>;
      files?: string[];
    };
    expect(pkgJson.exports?.['./oxlint']).toEqual({
      types: './src/oxlint.d.ts',
      default: './src/oxlint.js',
    });
    // The export points into src/ — src/ must ship in the tarball.
    expect(pkgJson.files).toContain('src/');
  });

  it('has the oxlint entry module on disk', () => {
    expect(fs.existsSync(path.join(pkgDir, 'src', 'oxlint.ts'))).toBe(true);
  });

  it('loads and exports a non-empty ESLint-shaped rule mapping', async () => {
    // `export = plugin` (CJS) surfaces at `.default` through ESM interop —
    // same access path the per-plugin oxlint.test.ts files use.
    const mod = (await import(path.join(pkgDir, 'src', 'oxlint.ts'))) as {
      default?: {
        meta?: { name?: string };
        rules?: Record<string, { create?: unknown }>;
      };
    };
    const plugin = mod.default;
    expect(
      plugin,
      `${pkgName}/oxlint did not export a plugin object`,
    ).toBeDefined();
    expect(plugin?.meta?.name).toBe(pkgName);

    const rules = plugin?.rules ?? {};
    const ruleNames = Object.keys(rules);
    expect(
      ruleNames.length,
      `${pkgName}/oxlint exported an empty rule mapping`,
    ).toBeGreaterThan(0);

    for (const [ruleName, rule] of Object.entries(rules)) {
      expect(
        typeof rule?.create,
        `${pkgName}/oxlint rule "${ruleName}" has no create() function`,
      ).toBe('function');
    }
  });
});

/**
 * Parity-bench plugin lists must name only live plugins.
 *
 * The ILB-oxlint-parity runner filters its `--plugins` shorts against the
 * generated manifest (`allowedShorts`), so a stale name is *silently dropped* —
 * no error, no warning. A deleted plugin can therefore sit in these lists
 * indefinitely while reading, to humans and agents, as "still covered".
 *
 * That exact failure shipped: `crypto` survived in both lists after
 * eslint-plugin-crypto was consolidated into node-security and deleted
 * (PR #167), which later produced a false "eslint-plugin-crypto has no
 * ./oxlint export — 10/11 security plugins covered" gap in the oxlint adoption
 * research, and a proposal to resurrect and republish a deliberately
 * deprecated package.
 *
 * Reverting either cleanup must turn CI red (CLAUDE.md regression contract).
 * The sibling guard for *documentation* mentions and *imports* of dead plugins
 * is packages/eslint-devkit/src/tests/no-deprecated-plugin-references.test.ts;
 * neither of its layers can see a bare short name in a string list.
 */
describe('ILB-oxlint-parity plugin lists name only live plugins', () => {
  const REPO_ROOT = path.resolve(__dirname, '..', '..');

  const manifest = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, '.agent', 'oxlint-jsplugins-manifest.json'),
      'utf8',
    ),
  ) as { plugins: Array<{ short: string; ruleCount: number }> };

  const liveShorts = new Set(
    manifest.plugins.filter((p) => p.ruleCount > 0).map((p) => p.short),
  );

  /** Shorts in run.ts's PLUGINS_DEFAULT array literal. */
  function readRunnerDefaults(): string[] {
    const src = fs.readFileSync(
      path.join(
        REPO_ROOT,
        'benchmarks',
        'suites',
        'ilb-oxlint-parity',
        'run.ts',
      ),
      'utf8',
    );
    const match = /const PLUGINS_DEFAULT = \[([^\]]*)\]/.exec(src);
    if (!match) throw new Error('PLUGINS_DEFAULT not found in run.ts');
    return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  }

  /** Shorts in every `--plugins a,b,c` occurrence across root package.json scripts. */
  function readScriptPluginLists(): string[] {
    const scripts = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'),
    ).scripts as Record<string, string>;
    return Object.values(scripts).flatMap((cmd) =>
      [...cmd.matchAll(/--plugins\s+([\w,-]+)/g)].flatMap((m) =>
        m[1].split(',').filter(Boolean),
      ),
    );
  }

  it('manifest exposes the live plugin set (sanity floor)', () => {
    // Deliberately well below the current count (19). This guards only against
    // a truncated/empty manifest making the two checks below vacuously pass —
    // it is NOT a plugin-count pin. `liveShorts` filters on `ruleCount > 0`, so
    // pinning it to the exact total would fail for the wrong reason the first
    // time a plugin is scaffolded with no rules yet. The real plugin-count
    // ratchet is the `pluginDirs.length` floor at the top of this file, which
    // counts directories and so isn't subject to that.
    expect(liveShorts.size).toBeGreaterThanOrEqual(10);
    // The consolidated-away plugin must never reappear as a manifest entry.
    expect(liveShorts.has('crypto')).toBe(false);
  });

  it('run.ts PLUGINS_DEFAULT contains no dead plugin shorts', () => {
    const defaults = readRunnerDefaults();
    expect(defaults.length).toBeGreaterThan(0);
    const dead = defaults.filter((s) => !liveShorts.has(s));
    expect(
      dead,
      `run.ts PLUGINS_DEFAULT names plugin(s) absent from the oxlint manifest: ` +
        `${dead.join(', ')}. These are silently dropped by allowedShorts — ` +
        `remove them, or run \`npm run oxlint:shims\` if a real plugin is missing.`,
    ).toEqual([]);
  });

  it('package.json --plugins lists contain no dead plugin shorts', () => {
    const listed = readScriptPluginLists();
    expect(listed.length).toBeGreaterThan(0);
    const dead = [...new Set(listed.filter((s) => !liveShorts.has(s)))];
    expect(
      dead,
      `package.json script(s) pass --plugins with name(s) absent from the ` +
        `oxlint manifest: ${dead.join(', ')}. Silently dropped at runtime.`,
    ).toEqual([]);
  });
});
