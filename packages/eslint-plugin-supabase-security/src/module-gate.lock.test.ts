/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: no rule in this plugin reports in a file that does not use
 * Supabase.
 *
 * It matters more here than in the sibling plugins. `.rpc()`, `.auth` and
 * `createBucket()` are ordinary member names — an ORM wrapper, a router, a test
 * double may own any of them — so an ungated rule would report on code that has
 * never seen Supabase. "Did not happen to fire" is not "cannot".
 *
 * Written over the whole rule registry rather than per rule, so a rule added
 * later is covered the day it lands: it will fail here until it is gated too.
 * Revert the gate in any single rule and this test goes red.
 */
import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { describe, expect, it } from 'vitest';

import plugin from './index';

const RULES = Object.keys(plugin.rules);

/** The import that is the whole difference between the two halves below. */
const SDK = "import { createClient } from '@supabase/supabase-js';";

/**
 * A real violation of `no-dynamic-rpc-name`. It appears twice on purpose: once
 * without the import (must be silent) and once with it (must report). One
 * fixture proving both directions is what stops this suite passing with the gate
 * shut on everything.
 */
const VIOLATION = `export const run = (db, name) => db.rpc(name, {});`;

/** Files that use no Supabase at all — every one of them owns a matching name. */
const NON_SDK_SOURCES: ReadonlyArray<readonly [string, string]> = [
  ['the violation itself, minus the import', VIOLATION],
  [
    'an ORM wrapper that owns `.rpc` and `.auth`',
    `export class Db {
       rpc(name: string) { return this.send(name); }
       get auth() { return { getUser: () => ({ data: null }) }; }
     }
     const { data } = await new Db().auth.getUser();`,
  ],
  [
    'a storage abstraction that owns createBucket',
    `export const store = { createBucket: (n: string, o: object) => ({ n, o }) };
     store.createBucket('assets', { public: true });`,
  ],
  [
    'a config module naming a service-role variable for something else',
    `export const config = { key: process.env.NEXT_PUBLIC_SERVICE_ROLE_TOKEN, retries: 3 };`,
  ],
  [
    'a plain helper',
    `export function parse(s: string) {
       try { return JSON.parse(s); } catch { return null; }
     }`,
  ],
];

const lint = (code: string, rule: string): Linter.LintMessage[] => {
  // `configType: 'flat'` because a bare `new Linter()` still defaults to
  // eslintrc on the declared ESLint floor, which would ignore the config below
  // and skip every rule — a suite that passes having run nothing.
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: {
        parser: parser as unknown as Linter.Parser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      plugins: { s: plugin as unknown as Linter.Plugin },
      rules: { [`s/${rule}`]: 'error' },
    },
    // Without a filename the Linter lints `<input>`, which matches no `files`
    // entry — every rule skipped, every negative below vacuously true.
    'sample.ts',
  );
};

describe('Supabase module gate', () => {
  it('the registry is non-empty, so the sweep below is not vacuous', () => {
    expect(RULES.length).toBeGreaterThan(0);
  });

  describe.each(NON_SDK_SOURCES)('%s', (_name, code) => {
    it.each(RULES)('%s reports nothing', (rule) => {
      const messages = lint(code, rule);
      // A parse or config error also yields zero *rule* findings, so it is
      // asserted away rather than counted as a pass.
      expect(messages.filter((m) => !m.ruleId)).toHaveLength(0);
      expect(messages.map((m) => m.ruleId)).toEqual([]);
    });
  });

  describe('positive control — the gate must open for real Supabase code', () => {
    it('the same violation reports once the file imports Supabase', () => {
      expect(
        lint(`${SDK}\n${VIOLATION}`, 'no-dynamic-rpc-name').length,
      ).toBeGreaterThan(0);
    });

    it('and is silent with the import removed', () => {
      expect(lint(VIOLATION, 'no-dynamic-rpc-name')).toHaveLength(0);
    });
  });

  /**
   * The module system must not decide whether the plugin runs.
   *
   * A hand-written gate is a pair of visitors — `ImportDeclaration`, and a
   * `CallExpression` whose callee is literally named `require`. That covers ESM
   * and plain CommonJS and nothing else, so a file written in TypeScript's
   * import-equals form, or one that lazily `await import(...)`s the client,
   * would run **no rule in this plugin at all** — not degraded, silent. Each
   * form below fails on the two-visitor gate and passes on the devkit probe.
   */
  describe.each([
    ['CommonJS require', `const supa = require('@supabase/supabase-js');`],
    [
      'CommonJS destructuring require',
      `const { createClient } = require('@supabase/supabase-js');`,
    ],
    [
      "TypeScript's import-equals",
      `import supa = require('@supabase/supabase-js');`,
    ],
    [
      'a lazy dynamic import',
      `export async function boot() { const { createClient } = await import('@supabase/supabase-js'); return createClient; }`,
    ],
    ['a re-export', `export { createClient } from '@supabase/supabase-js';`],
    [
      'the ssr package, which is where the client is actually built',
      `import { createBrowserClient } from '@supabase/ssr';`,
    ],
  ])('the gate opens on %s', (_form, load) => {
    it('and the same violation reports', () => {
      expect(
        lint(`${load}\n${VIOLATION}`, 'no-dynamic-rpc-name').length,
      ).toBeGreaterThan(0);
    });
  });

  it('but a locally bound `require` parameter is not a module load', () => {
    const code = `function wrap(require) { return require('@supabase/supabase-js'); }\n${VIOLATION}`;
    expect(lint(code, 'no-dynamic-rpc-name')).toHaveLength(0);
  });
});
