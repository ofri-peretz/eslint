/**
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Lock — every published plugin's npm description opens with the phrase people
 * search for: `ESLint <topic> ... rules — ` (or `Oxlint ...` for the aliases).
 *
 * npm search ranks the exact phrase in the description above download counts.
 * Measured 2026-11-15 for "eslint security": eslint-plugin-secure-access (15
 * downloads a week, description "ESLint security to rule...") ranked #8, while
 * eslint-plugin-secure-coding (5,127 a week, "ESLint plugin for secure coding")
 * ranked #202. The old opening, "ESLint plugin for <topic> —", splits the
 * search words apart and is refused here.
 *
 * @provenBy {"file":"packages/eslint-plugin-secure-coding/package.json","find":"\"description\": \"ESLint security rules for secure coding","replace":"\"description\": \"ESLint plugin for secure coding"}
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PACKAGES = join(resolve(__dirname, '..', '..'), 'packages');

const published = readdirSync(PACKAGES)
  .filter((dir) => existsSync(join(PACKAGES, dir, 'package.json')))
  .map(
    (dir) =>
      JSON.parse(readFileSync(join(PACKAGES, dir, 'package.json'), 'utf8')) as {
        name: string;
        private?: boolean;
        description?: string;
      },
  )
  .filter((pkg) => pkg.private !== true);

describe('npm descriptions open with the phrase people search for', () => {
  it.each(published.filter((p) => /^(eslint|oxlint)-plugin-/.test(p.name)))(
    '$name',
    ({ name, description = '' }) => {
      const engine = name.startsWith('oxlint-') ? 'Oxlint' : 'ESLint';
      const opening = description.split(' — ')[0];
      expect(opening, 'starts with the engine name').toMatch(
        new RegExp(`^${engine} `),
      );
      expect(opening, 'names its rules before the dash').toMatch(/ rules\b/);
      expect(opening, 'no "plugin for" between engine and topic').not.toMatch(
        /^\w+ plugin for /,
      );
    },
  );

  it.each(published.filter((p) => p.name.startsWith('@interlace/eslint-')))(
    '$name',
    ({ description = '' }) => {
      expect(description).toMatch(/^ESLint /);
    },
  );
});
