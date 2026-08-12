/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Every published plugin must be usable under its own package name.
 *
 * The failure this locks is worse than any false positive, because the plugin
 * does not run at all:
 *
 *   import jwtSecurity from 'eslint-plugin-jwt-security';
 *   export default [{
 *     plugins: { 'jwt-security': jwtSecurity },
 *     rules: { ...jwtSecurity.configs.recommended.rules },
 *   }];
 *
 *   A configuration object specifies rule "jwt/no-algorithm-none",
 *   but could not find plugin "jwt".
 *
 * `eslint-plugin-jwt-security` was renamed from `eslint-plugin-jwt`, but its
 * presets kept emitting the pre-rename `jwt/` prefix, so registering under the
 * package name — the obvious thing, and the thing every README shows — failed.
 * `eslint-plugin-postgresql-security` had the identical shape with `pg/`.
 * Between them, 66 rule ids in shipped presets pointed at a plugin key no
 * adopter would guess.
 *
 * Two assertions, because the first alone is not enough:
 *
 *   1. **prefix == package suffix** — the rule id an adopter reads out of our
 *      preset names the plugin they registered.
 *   2. **the prefix is registered in that same config's `plugins` block** —
 *      a preset that names a plugin it does not register is only usable by
 *      someone who happens to register it under the matching key by hand.
 *
 * A rename can satisfy (1) while breaking (2), and a self-registering preset
 * can satisfy (2) with any prefix at all, which is exactly how both defects
 * survived: each config carried `plugins: { jwt: plugin }`, so it worked for
 * anyone who spread the whole config object and broke for everyone who spread
 * `.rules`.
 *
 * Iterating every plugin rather than pinning the two that were broken is the
 * point — this is the class, not the instance, and the next rename gets caught
 * before it is published rather than by an adopter's crash report.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const PACKAGES = path.join(REPO_ROOT, 'packages');

/**
 * Deprecated plugin keys a config may still register *in addition to* its
 * canonical one, so configs written against the pre-rename prefix keep
 * resolving for a deprecation window.
 *
 * An alias is allowed to be registered; it is never allowed to be the prefix
 * a rule id is written with. That asymmetry is the whole deprecation: new rule
 * ids are canonical, old hand-written ones still resolve.
 */
const DEPRECATED_ALIASES: Readonly<Record<string, string>> = {
  'jwt-security': 'jwt',
  'postgresql-security': 'pg',
};

type FlatBlock = {
  plugins?: Record<string, unknown>;
  rules?: Record<string, unknown>;
};

const pluginDirs = fs
  .readdirSync(PACKAGES)
  .filter((d) => d.startsWith('eslint-plugin-'))
  .filter((d) => fs.existsSync(path.join(PACKAGES, d, 'src/index.ts')))
  .sort();

it('found the plugin packages to check', () => {
  // Guards the guard: a glob that stops matching would make every test below
  // pass by iterating nothing — the vacuous green this file exists to prevent.
  expect(pluginDirs.length).toBeGreaterThanOrEqual(25);
});

describe.each(pluginDirs)('%s', (dir) => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(PACKAGES, dir, 'package.json'), 'utf8'),
  ) as { name: string };
  const expected = manifest.name.replace(/^eslint-plugin-/, '');

  it('every preset rule id is prefixed with the package name, and registers it', async () => {
    const mod = (await import(
      pathToFileURL(path.join(PACKAGES, dir, 'src/index.ts')).href
    )) as { configs?: Record<string, unknown>; default?: { configs?: Record<string, unknown> } };

    const configs = mod.configs ?? mod.default?.configs ?? {};
    const names = Object.keys(configs);
    expect(names.length, `${manifest.name} exports no configs`).toBeGreaterThan(0);

    const wrongPrefix: string[] = [];
    const unregistered: string[] = [];
    let ruleIds = 0;

    for (const name of names) {
      const value = configs[name];
      const blocks: FlatBlock[] = Array.isArray(value)
        ? (value as FlatBlock[])
        : [value as FlatBlock];

      for (const block of blocks) {
        const registered = new Set(Object.keys(block?.plugins ?? {}));
        for (const ruleId of Object.keys(block?.rules ?? {})) {
          ruleIds += 1;
          const prefix = ruleId.split('/')[0];
          if (prefix !== expected) wrongPrefix.push(`${name}: ${ruleId}`);
          if (!registered.has(prefix)) unregistered.push(`${name}: ${ruleId}`);
        }
      }
    }

    expect(ruleIds, `${manifest.name} presets enable no rules`).toBeGreaterThan(0);
    expect(
      wrongPrefix,
      `rule ids must be prefixed "${expected}/" so registering the plugin under its own package name works`,
    ).toEqual([]);
    expect(
      unregistered,
      `these rule ids name a plugin key their own config does not register`,
    ).toEqual([]);
  });

  it('registers only its canonical key and, at most, its recorded deprecated alias', async () => {
    // Without this, "keep the old key working" quietly becomes "register
    // anything", and a future rename leaves three live keys with nothing
    // recording which one is real.
    const mod = (await import(
      pathToFileURL(path.join(PACKAGES, dir, 'src/index.ts')).href
    )) as { configs?: Record<string, unknown>; default?: { configs?: Record<string, unknown> } };

    const configs = mod.configs ?? mod.default?.configs ?? {};
    const allowed = new Set([expected]);
    const alias = DEPRECATED_ALIASES[expected];
    if (alias) allowed.add(alias);

    const unexpected = new Set<string>();
    for (const value of Object.values(configs)) {
      const blocks: FlatBlock[] = Array.isArray(value)
        ? (value as FlatBlock[])
        : [value as FlatBlock];
      for (const block of blocks) {
        for (const key of Object.keys(block?.plugins ?? {})) {
          if (!allowed.has(key)) unexpected.add(key);
        }
      }
    }

    expect([...unexpected]).toEqual([]);
  });
});

it('every recorded alias still belongs to a package that exists', () => {
  // A ratchet: when an alias is dropped in a major, this fails until the entry
  // is deleted, so the list cannot outlive the deprecation it documents.
  const suffixes = new Set(pluginDirs.map((d) => d.replace(/^eslint-plugin-/, '')));
  for (const canonical of Object.keys(DEPRECATED_ALIASES)) {
    expect(suffixes.has(canonical), `${canonical} is no longer a package`).toBe(true);
  }
});
