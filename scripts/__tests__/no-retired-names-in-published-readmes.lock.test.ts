/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Workspace lock — a published README never tells a reader to install a retired name.
 *
 * #414 renamed `eslint-plugin-pg` → `eslint-plugin-postgresql-security` and
 * `eslint-plugin-jwt` → `eslint-plugin-jwt-security`. The generated ecosystem table
 * moved with it, because a generator owns it. Two hand-written lines did not:
 * `secure-coding`'s "extend your coverage" block still linked
 * `npmjs.com/package/eslint-plugin-jwt`, and `sequelize-security`'s prose still named
 * `eslint-plugin-pg`.
 *
 * Nothing caught them. `map:names:check` compares registry identifiers,
 * `lint:name-inference` reads rule ids, `check-links` only asks whether a URL
 * resolves — and these resolve fine, to a deprecated package. Prose that no generator
 * owns had no gate at all, and a deprecated package is the worst kind of live link:
 * following `eslint-plugin-pg` installs the frozen pre-rename build, the name-matching
 * version whose false positives the evidence gating exists to remove.
 *
 * Scope is deliberately the published READMEs. Audits, exposure logs and AGENTS.md
 * name the old packages correctly — they are recording history, and a lock that
 * cannot tell an instruction from a record would force them to lie.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '../..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const ALIAS_LOCK = join(REPO_ROOT, 'benchmarks/__tests__/plugin-prefix-identity.lock.test.ts');

/**
 * Retired prefixes, parsed from the lock that already owns them, so this file cannot
 * disagree with it. A future rename updates one map and both checks follow.
 */
function retiredNames(): string[] {
  const src = readFileSync(ALIAS_LOCK, 'utf-8');
  const block = src.match(/DEPRECATED_ALIASES[^=]*=\s*\{([\s\S]*?)\}/)?.[1];
  if (!block) throw new Error(`Could not parse DEPRECATED_ALIASES from ${ALIAS_LOCK}`);
  return [...block.matchAll(/:\s*'([a-z0-9-]+)'/g)].map((m) => `eslint-plugin-${m[1]}`);
}

/** Published packages only — a private package ships no README to npm. */
function publishedReadmes(): { dir: string; text: string }[] {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .flatMap((e) => {
      const manifest = join(PACKAGES_DIR, e.name, 'package.json');
      const readme = join(PACKAGES_DIR, e.name, 'README.md');
      if (!existsSync(manifest) || !existsSync(readme)) return [];
      if (JSON.parse(readFileSync(manifest, 'utf-8')).private) return [];
      return [{ dir: e.name, text: readFileSync(readme, 'utf-8') }];
    })
    .sort((a, b) => a.dir.localeCompare(b.dir));
}

const RETIRED = retiredNames();
const READMES = publishedReadmes();

describe('no retired package names in published READMEs', () => {
  it('knows which names are retired', () => {
    // Guards the guard: an empty list would make every assertion below vacuous.
    expect(RETIRED.length).toBeGreaterThan(0);
    expect(RETIRED).toContain('eslint-plugin-jwt');
  });

  it('found the READMEs it is meant to be checking', () => {
    expect(READMES.length).toBeGreaterThan(20);
  });

  it.each(READMES.map((r) => [r.dir, r] as const))('%s names no retired package', (dir, readme) => {
    for (const name of RETIRED) {
      // Not followed by `-`, so `eslint-plugin-jwt-security` is not a match for
      // `eslint-plugin-jwt`. That substring is exactly why a manual grep missed these.
      const re = new RegExp(`${name}(?![a-z0-9-])`, 'g');
      const hits = [...readme.text.matchAll(re)].map((m) => {
        const line = readme.text.slice(0, m.index).split('\n').length;
        return `${dir}/README.md:${line}`;
      });
      expect(
        hits,
        `${dir}/README.md points a reader at \`${name}\`, which is deprecated on npm. ` +
          'Following it installs the frozen pre-rename build. Use the current name.',
      ).toEqual([]);
    }
  });
});
