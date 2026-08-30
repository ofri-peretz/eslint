/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Behavioural lock: no shipped rule carries a dead `meta.docs.url`.
 *
 * `meta.docs.url` is what ESLint hands to editors, CLI output and SARIF, so a wrong
 * value is a 404 in every consumer's IDE — invisible from our own site, which never
 * renders it.
 *
 * `scripts/__tests__/canonical-docs-urls.lock.test.ts` locks the *source text* of the
 * wiring (slug registered, `withCanonicalDocsUrls` called). It cannot see what a rule
 * object actually ends up with, so it stayed green through the gap this file closes:
 * devkit's default `createRule` used to mint
 * `packages/eslint-plugin/docs/rules/<name>.md` — a package that has never existed in
 * this repo — and `withCanonicalDocsUrls` only overwrites it for slugs registered in
 * `PLUGIN_DOCS_CATEGORY`. A rule authored before its plugin was registered kept the
 * placeholder and shipped the 404.
 *
 * This lock loads every plugin barrel and reads the real values off the real rules.
 *
 * Run from the repo root:
 *   npx vitest run --config scripts/__tests__/vitest.config.mts scripts/__tests__/rule-docs-url-lock.test.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const PACKAGES_DIR = path.resolve(__dirname, '..', '..', 'packages');

const DEAD_PLACEHOLDER = 'packages/eslint-plugin/';
const CANONICAL_ORIGIN = 'https://eslint.interlace.tools/docs/';

type Rule = { meta?: { docs?: { url?: string } } };

const pluginDirs = fs
  .readdirSync(PACKAGES_DIR)
  .filter((name) => name.startsWith('eslint-plugin-'))
  .filter((name) => fs.statSync(path.join(PACKAGES_DIR, name)).isDirectory())
  .filter((name) =>
    fs.existsSync(path.join(PACKAGES_DIR, name, 'src/index.ts')),
  )
  .sort();

it('enumerates the eslint-plugin-* packages (guards a vacuous pass)', () => {
  // Ratchet floor, not an exact pin: adding a plugin must not break the lock,
  // silently losing the whole enumeration should.
  expect(pluginDirs.length).toBeGreaterThanOrEqual(29);
});

/**
 * Read the barrel's rule map. `import()` resolves through the plugin aliases in
 * `vitest.config.mts`, so this is the TS source — the thing a regression lands in —
 * not a built artifact that may not exist in this job.
 */
async function loadRules(pkgName: string): Promise<[string, Rule][]> {
  const mod = (await import(pkgName)) as {
    rules?: Record<string, Rule>;
    default?: { rules?: Record<string, Rule> };
  };
  const rules = mod.rules ?? mod.default?.rules ?? {};
  // Reading each entry is what fires the lazy getters the barrel defers rules behind,
  // and therefore what stamps the canonical URL. A test that only counted keys would
  // never touch a single `meta`.
  return Object.entries(rules);
}

describe.each(pluginDirs)('%s rule docs URLs', (pkgName) => {
  it('exports rules (guards a vacuous pass for this plugin)', async () => {
    expect((await loadRules(pkgName)).length).toBeGreaterThan(0);
  });

  it('never ships the dead packages/eslint-plugin/ placeholder', async () => {
    const dead = (await loadRules(pkgName))
      .filter(([, rule]) => rule.meta?.docs?.url?.includes(DEAD_PLACEHOLDER))
      .map(([name, rule]) => `${name} -> ${rule.meta?.docs?.url}`);
    expect(dead).toEqual([]);
  });

  it('points every rule at the canonical docs site', async () => {
    // The failure mode this catches is a new plugin missing from PLUGIN_DOCS_CATEGORY:
    // `docsUrlFor` returns null, nothing is stamped, and every rule in the plugin ships
    // with no docs link at all. Registering the slug in devkit is the fix.
    //
    // Asserts the origin only, not the full path. Plugins that export a rule under both
    // a flat and a namespaced key ('no-x' and 'group/no-x') share one rule object, so
    // the last key stamped wins and the flat key's URL carries the namespaced path.
    // That is a separate defect; pinning the path here would conflate the two.
    const offenders = (await loadRules(pkgName))
      .filter(([, rule]) => !rule.meta?.docs?.url?.startsWith(CANONICAL_ORIGIN))
      .map(([name, rule]) => `${name} -> ${rule.meta?.docs?.url ?? '(none)'}`);
    expect(offenders).toEqual([]);
  });
});
