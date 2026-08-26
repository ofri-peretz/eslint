/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The lock for the bug that made the real-code measurement meaningless.
 *
 * `eslint.benchmark.config.mjs` matched `files: ['**\/*.js']` with no
 * TypeScript parser, and no output said so. A scan of 112 repositories and
 * 345,841 files reported 200 rules firing; every one of the 704 sample paths
 * in the inventory ended in `.js`, and the 214,855 TypeScript files in the
 * same cache were walked, handed to ESLint, and matched by no config block.
 *
 * Silence from a rule and silence from a rule that never ran look identical in
 * a findings count. These assertions are the difference, and each one fails on
 * the config as it was:
 *
 *   1. a `.ts` file is linted at all
 *   2. a `.tsx` file is linted at all — react-a11y and react-features have no
 *      other material, and both reported zero across excalidraw, MUI and kibana
 *   3. every plugin on disk is registered — five were missing, and an absent
 *      plugin reports nothing, which reads exactly like a plugin that found
 *      nothing
 */
import { describe, expect, it } from 'vitest';
import { Linter } from 'eslint';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG = path.join(ROOT, 'eslint.real-source.config.mjs');

/** Plugin directories that ship rules, read off the filesystem. */
function pluginsOnDisk(): string[] {
  const out: string[] = [];
  for (const dir of fs.readdirSync(path.join(ROOT, 'packages'))) {
    if (!dir.startsWith('eslint-plugin-')) continue;
    if (!fs.existsSync(path.join(ROOT, 'packages', dir, 'src', 'rules'))) continue;
    out.push(dir.replace('eslint-plugin-', ''));
  }
  return out.sort();
}

/** Two plugins publish under a prefix that differs from their directory. */
const PUBLISHED_PREFIX: Record<string, string> = {
  'jwt-security': 'jwt',
  'postgresql-security': 'pg',
};

describe('the real-source config', () => {
  it('registers every plugin that ships rules', async () => {
    const [config] = (await import(CONFIG)).default as [{ plugins: Record<string, unknown> }];
    const registered = new Set(Object.keys(config.plugins));
    const missing = pluginsOnDisk()
      .map((name) => PUBLISHED_PREFIX[name] ?? name)
      .filter((name) => !registered.has(name));
    expect(missing).toEqual([]);
  });

  /**
   * Not "does the rule fire" — "does ANY rule get the chance to". The probe is
   * a shape several rules report on, so the assertion survives any single rule
   * being retired.
   */
  it.each([
    ['a TypeScript file', 'probe.ts', `const password: string = 'hunter2';\nexport default password;\n`],
    [
      'a TSX file',
      'probe.tsx',
      `export const App = () => <img src="a.png" />;\n`,
    ],
    ['a JSX file', 'probe.jsx', `export const App = () => <img src="a.png" />;\n`],
  ])('lints %s', async (_label, filename, code) => {
    // The config OBJECT, not the config path. ESLint's own loader cannot read
    // the plugins' `.ts` sources — the scan gets away with it because the whole
    // process runs under tsx, and vitest's transform does not reach that far.
    const [block] = (await import(CONFIG)).default as [Linter.Config];
    const messages = new Linter({ configType: 'flat' }).verify(code, block, filename);

    /**
     * The exact shape of the original bug. ESLint answers a file no config
     * block matches with one `ruleId: null` message saying so, and a caller
     * that only counts findings cannot tell that from a clean file. The scan
     * counted findings.
     */
    const unmatched = messages.filter(
      (m) => m.ruleId === null && /No matching configuration/i.test(m.message),
    );
    expect(unmatched).toEqual([]);
    expect(messages.filter((m) => m.fatal)).toEqual([]);
    expect(messages.filter((m) => m.ruleId !== null).length).toBeGreaterThan(0);
  });
});
