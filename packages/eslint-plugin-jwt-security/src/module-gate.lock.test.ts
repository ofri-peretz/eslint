/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Regression lock: no rule in this plugin reports in a file that does not use
 * a JWT library.
 *
 * Measured over 107,382 files across 107 repositories it reports 27 findings in
 * files importing no JWT library, down from 702 before `isJwtLibraryCall`
 * started requiring the import. That helper is the gate; this lock is what
 * stops a future rule from skipping it.
 *
 * Written over the whole rule registry rather than per rule, so a rule added
 * later is covered the day it lands: it will fail here until it is gated too.
 * Revert the gate in any single rule and this test goes red.
 */
import { describe, it, expect } from 'vitest';
import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';
import plugin from './index';

const RULES = Object.keys(plugin.rules);

/** The SDK import that is the whole difference between the two halves below. */
const SDK = "import jwt from 'jsonwebtoken';";

/**
 * A real violation of `no-hardcoded-secret`. It appears twice on purpose: once
 * without the import (must be silent) and once with it (must report). One
 * fixture proving both directions is what stops this suite passing with the
 * gate shut on everything.
 */
const VIOLATION = `jwt.sign(payload, 'super-secret-value');`;

/** Files that use no a JWT library at all. */
const NON_SDK_SOURCES: ReadonlyArray<readonly [string, string]> = [
  ['the violation itself, minus the import', VIOLATION],
  [
    'a plain helper',
    `export function parse(s: string) {
       try { return JSON.parse(s); } catch { return null; }
     }`,
  ],
  [
    'a React component',
    `export default function Panel({ items }) {
       return items.map((i) => i.name).join(', ');
     }`,
  ],
  [
    'a config module',
    `export const config = { token: process.env.API_TOKEN, retries: 3 };`,
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
      plugins: { j: plugin as unknown as Linter.Plugin },
      rules: { [`j/${rule}`]: 'error' },
    },
    // Without a filename the Linter lints `<input>`, which matches no `files`
    // entry — every rule skipped, every negative below vacuously true.
    'sample.ts',
  );
};

describe('a JWT library module gate', () => {
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

  describe('positive control — the gate must open for real a JWT library code', () => {
    it('the same violation reports once the file imports the SDK', () => {
      expect(lint(`${SDK}\n${VIOLATION}`, 'no-hardcoded-secret').length).toBeGreaterThan(0);
    });

    it('and is silent with the import removed', () => {
      expect(lint(VIOLATION, 'no-hardcoded-secret')).toHaveLength(0);
    });
  });

  /**
   * The gate reads the whole tree, not `Program.body`.
   *
   * The CommonJS fix that started this audit replaced an `ImportDeclaration`-only
   * check with a scanner over top-level statements. That is still a narrower
   * gate than it looks: lazily requiring the library inside the function that
   * uses it is ordinary Node, and it left every rule off. Each form below fails
   * on the top-level scanner and passes on the devkit probe.
   */
  describe.each([
    ['a top-level require', `const jwt = require('jsonwebtoken');`],
    [
      'a require nested inside a function',
      `function issue(payload) { const jwt = require('jsonwebtoken'); return jwt; }`,
    ],
    ["TypeScript's import-equals", `import jwtNs = require('jsonwebtoken');`],
    [
      'a lazy dynamic import',
      `export async function boot() { const m = await import('jsonwebtoken'); return m; }`,
    ],
    ['a re-export', `export { sign } from 'jsonwebtoken';`],
    ["Deno's npm: specifier", `import jwtDeno from 'npm:jsonwebtoken';`],
  ])('the gate opens on %s', (_form, load) => {
    it('and the same violation reports', () => {
      expect(lint(`${load}\n${VIOLATION}`, 'no-hardcoded-secret').length).toBeGreaterThan(0);
    });
  });

  /**
   * Precision half of the same defect, and the reason opening the gate is not
   * free.
   *
   * `receiverIsForeignImport` is what stops `argon.verify(hash, pw)` in a JWT
   * tutorial being read as a JWT verification. It read `ImportDeclaration` only,
   * so once the file gate accepted CommonJS the two halves disagreed: the file
   * counted as JWT code and the `argon2` receiver resolved to nothing, which is
   * the "leave it alone" branch. Measured before the fix, the CommonJS spelling
   * below reported from four rules while the ESM spelling was silent.
   */
  describe('a foreign receiver is foreign in every module system', () => {
    const call = `export async function check(u, p) { return argon.verify(u.hash, p); }`;
    const FOREIGN: ReadonlyArray<readonly [string, string]> = [
      ['ESM', `import argon from 'argon2';\nimport jwt from 'jsonwebtoken';`],
      [
        'CommonJS',
        `const argon = require('argon2');\nconst jwt = require('jsonwebtoken');`,
      ],
      [
        'CommonJS destructuring',
        `const { verify: argon } = require('argon2');\nconst jwt = require('jsonwebtoken');`,
      ],
      [
        'import-equals',
        `import argon = require('argon2');\nimport jwt = require('jsonwebtoken');`,
      ],
    ];

    describe.each(FOREIGN)('%s', (_form, loads) => {
      it.each(RULES)('%s does not report on argon.verify', (rule) => {
        expect(lint(`${loads}\n${call}`, rule)).toHaveLength(0);
      });
    });

    /**
     * Receiver spellings that still resolve to a foreign package.
     *
     * `require('argon2').default` is the interop spelling CommonJS code uses
     * for an ESM-authored dependency, and the two Deno forms are the same
     * package with a resolver prefix — all three must reject exactly as the
     * bare names above do.
     */
    describe.each([
      [
        'a member-accessed require',
        `const argon = require('argon2').default;\nconst jwt = require('jsonwebtoken');`,
      ],
      [
        "Deno's npm: specifier",
        `import argon from 'npm:argon2';\nimport jwt from 'jsonwebtoken';`,
      ],
      [
        'a deno.land/x URL',
        `import argon from 'https://deno.land/x/argon2@v1.0.0/mod.ts';\nimport jwt from 'jsonwebtoken';`,
      ],
    ])('%s', (_form, loads) => {
      it('is still foreign', () => {
        expect(lint(`${loads}\n${call}`, 'require-issuer-validation')).toHaveLength(0);
      });
    });

    /**
     * The deliberate other side of the trade, pinned so it stays deliberate.
     *
     * Only an import we can *read* and can see is foreign rejects. A receiver
     * that resolves to nothing is left alone, because a JWT client is very
     * often injected or built rather than imported, and demanding a resolvable
     * import would trade this false-positive class for a false-negative one.
     * Each shape below is unresolvable, so each is still judged a JWT call.
     */
    describe.each([
      ['a namespace alias', `import argon = ns.Thing;\nimport jwt from 'jsonwebtoken';`],
      ['a declarator with no initialiser', `let argon;\nimport jwt from 'jsonwebtoken';`],
      [
        'a value built by a factory',
        `const argon = buildHasher();\nimport jwt from 'jsonwebtoken';`,
      ],
      [
        'a computed require specifier',
        `const argon = require(pkgName);\nimport jwt from 'jsonwebtoken';`,
      ],
      [
        'an array-destructured binding',
        `const [argon] = require('argon2');\nimport jwt from 'jsonwebtoken';`,
      ],
    ])('%s is unresolvable, not foreign', (_form, loads) => {
      it('so the call is still judged a JWT call', () => {
        expect(
          lint(`${loads}\n${call}`, 'require-issuer-validation').length,
        ).toBeGreaterThan(0);
      });
    });
  });
});
