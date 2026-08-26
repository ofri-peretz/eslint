/**
 * Tests for no-cryptojs rule
 * CWE-1104: Use of Unmaintained Third Party Components
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noCryptojs } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('no-cryptojs', () => {
  ruleTester.run('no-cryptojs', noCryptojs, {
    valid: [
        'const x = 42;',
        'const flag = true;',
      // Valid: Native crypto
      { name: 'node:crypto', code: 'import crypto from "node:crypto";' },
      { code: 'const crypto = require("crypto");' },
      // Valid: Other packages
      { code: 'import hash from "crypto-hash";' },
    ],
    invalid: [
      // Invalid: crypto-js import
      {
        name: 'crypto-js where node:crypto is available',
        code: 'import CryptoJS from "crypto-js";',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      // Invalid: crypto-js submodule import
      {
        code: 'import { AES } from "crypto-js/aes";',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      // Invalid: crypto-js require
      {
        code: 'const CryptoJS = require("crypto-js");',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      // Invalid: crypto-js submodule require
      {
        code: 'const MD5 = require("crypto-js/md5");',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
    ],
  });

  /**
   * Regression lock — the four ways a dependency arrives that the rule never
   * looked at, plus the two directions `callee.name === 'require'` got wrong.
   *
   * The corpus at `benchmarks/rule-corpus/node-security__no-cryptojs` scored
   * 5 TP / 2 FP / 10 FN before this; every `invalid` case below is QUIET on the
   * pre-fix rule and every `valid` case in the second group REPORTS on it.
   */
  ruleTester.run('no-cryptojs — every specifier site', noCryptojs, {
    valid: [
      // A local `require` is a different function. Both spellings.
      {
        code: [
          'const stubs = { "crypto-js": {} };',
          'function require(id) { return stubs[id]; }',
          'export const s = () => require("crypto-js");',
        ].join('\n'),
      },
      {
        code: [
          'const modules = new Map();',
          'const require = (id) => modules.get(id);',
          'export const s = () => require("crypto-js");',
        ].join('\n'),
      },
      // The newly-visited sites, pointed at local modules.
      { code: 'export async function f() { return import("./legacy/crypto-js-adapter.js"); }' },
      { code: 'export * from "./crypto/native.js";' },
      { code: 'export { seal } from "./crypto/envelope.js";' },
      // An export declaration with no module source, whose VALUE is the name.
      { code: 'export const DEPRECATED = "crypto-js";' },
      // createRequire is recognised without reporting everything it loads.
      {
        code: [
          'import { createRequire } from "node:module";',
          'const load = createRequire(import.meta.url);',
          'export const db = load("better-sqlite3");',
        ].join('\n'),
      },
      // A require call with no arguments at all.
      { code: 'const x = require();' },
      // `import x = A.B` — an import-equals whose reference is a namespace, not
      // a module specifier.
      { code: 'namespace A { export const B = 1; }\nimport C = A.B;\nexport const d = C;' },
      // A specifier that cannot be resolved is no evidence.
      { code: 'const name = pick(); const m = require(name);' },
    ],
    invalid: [
      // Dynamic import.
      {
        code: 'export async function f() { return import("crypto-js"); }',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      // Dynamic import behind a bundler magic comment.
      {
        code: 'export async function f() { return import(/* webpackChunkName: "c" */ "crypto-js"); }',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      // Named re-export and wildcard re-export.
      {
        code: 'export { AES, enc } from "crypto-js";',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      {
        code: 'export * from "crypto-js";',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      {
        code: 'export { default as md5 } from "crypto-js/md5";',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      // TypeScript's import-equals form.
      {
        code: 'import CryptoJS = require("crypto-js");',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      // createRequire, destructured and namespaced.
      {
        code: [
          'import { createRequire } from "node:module";',
          'const load = createRequire(import.meta.url);',
          'export const c = load("crypto-js");',
        ].join('\n'),
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      {
        code: [
          'import nodeModule from "node:module";',
          'const req = nodeModule.createRequire(import.meta.url);',
          'export const c = req("crypto-js");',
        ].join('\n'),
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      // The specifier hoisted to a const, and spelled with backticks.
      {
        code: 'const PKG = "crypto-js";\nexport const c = require(PKG);',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      {
        code: 'export const c = require(`crypto-js`);',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
      // `declare const require` is a type declaration for the same injected global.
      {
        code: 'declare const require: (id: string) => unknown;\nexport const c = require("crypto-js");',
        errors: [{ messageId: 'deprecatedCryptojs' }],
      },
    ],
  });

  /**
   * Lock: this rule takes no options.
   *
   * It used to declare `severity: 'error' | 'warn'`, defaulted to `'warn'`, and
   * document it as "Severity level for reports". Nothing read it, and no rule
   * can read it — ESLint decides severity from the config entry. Anyone who set
   * it got warn-level reports and silence about the mistake. Re-adding an
   * option that `create()` does not consume should fail here.
   */
  it('declares an empty schema — no inert `severity` option', () => {
    expect(noCryptojs.meta.schema).toEqual([]);
  });
});
