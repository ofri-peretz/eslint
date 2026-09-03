/**
 * Coverage-gap tests for prefer-native-crypto.
 * Layer 1: require() of a third-party crypto lib, non-require calls.
 * Layer 2: ImportDeclaration with a non-string source value — impossible via
 * the real parser (import sources are always string literals), exercised with
 * createWithMockContext from @interlace/eslint-devkit.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { createWithMockContext } from '@interlace/eslint-devkit';
import { preferNativeCrypto } from './index';

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

describe('prefer-native-crypto coverage gaps', () => {
  ruleTester.run('prefer-native-crypto', preferNativeCrypto, {
    valid: [
      // CallExpression that is not require() → member guard falls through
      { code: 'loadCrypto("crypto-js");' },
      // require() of a non-crypto lib → THIRD_PARTY_CRYPTO_LIBS miss
      { code: 'require("lodash");' },
    ],
    invalid: [
      // require() of a third-party crypto lib → reported
      {
        code: 'const CryptoJS = require("crypto-js");',
        errors: [{ messageId: 'preferNative' }],
      },
      // Scoped path require → base package extraction
      {
        code: 'const aes = require("crypto-js/aes");',
        errors: [{ messageId: 'preferNative' }],
      },
    ],
  });

  /**
   * Regression lock — the four specifier sites the rule never visited, the two
   * directions `callee.name === 'require'` got wrong, and the digest packages
   * the list was missing.
   *
   * The corpus at `benchmarks/rule-corpus/node-security__prefer-native-crypto`
   * scored 6 TP / 1 FP / 9 FN before this. Every `invalid` case below is QUIET
   * on the pre-fix rule; the local-`require` case REPORTS on it.
   */
  ruleTester.run('prefer-native-crypto — every specifier site', preferNativeCrypto, {
    valid: [
      // A local `require` is a different function.
      {
        code: [
          'const stubs = { sjcl: {} };',
          'function require(id) { return stubs[id]; }',
          'export const s = () => require("sjcl");',
        ].join('\n'),
      },
      // Exact membership, never a prefix test.
      { code: 'import { parse } from "node-forge-parser-shim";' },
      { code: 'const m = require("md5-file-stream");' },
      // A scoped specifier's base name is the scope.
      { code: 'import { sha256 } from "@noble/hashes/sha256";' },
      // `crypto-browserify` deliberately stays out: it stands in FOR node:crypto.
      { code: 'const crypto = require("crypto-browserify");' },
      // Newly-visited sites pointed at local modules, and an export with no source.
      { code: 'export async function f() { return import("./legacy/sjcl-adapter.js"); }' },
      { code: 'export * from "./crypto/native.js";' },
      { code: 'export const REPLACEMENTS = { sjcl: "node:crypto" };' },
      // The native bcrypt binding is the remediation, not the finding.
      { code: 'const bcrypt = require("bcrypt");' },
      // A require-shaped call whose callee is not an identifier at all.
      { code: 'mod.require("sjcl");' },
      // A `require` shadow written as a function expression.
      {
        code: 'const require = function (id) { return { sjcl: {} }[id]; };\nexport const s = () => require("sjcl");',
      },
      // A call with no arguments.
      { code: 'const x = require();' },
      // `import x = A.B` — an import-equals whose reference is a namespace.
      { code: 'namespace A { export const B = 1; }\nimport C = A.B;\nexport const d = C;' },
      // A binding named `require` that is not a loader and not a function.
      { code: 'let require;\nexport const s = () => require;' },
    ],
    invalid: [
      {
        code: 'export async function f() { return import("node-forge"); }',
        errors: [{ messageId: 'preferNative' }],
      },
      {
        code: 'export { default as legacyCipher } from "sjcl";',
        errors: [{ messageId: 'preferNative' }],
      },
      {
        code: 'export * from "sjcl";',
        errors: [{ messageId: 'preferNative' }],
      },
      {
        code: 'import forge = require("node-forge");',
        errors: [{ messageId: 'preferNative' }],
      },
      {
        code: [
          'import { createRequire } from "node:module";',
          'const load = createRequire(import.meta.url);',
          'export const md5 = load("js-md5");',
        ].join('\n'),
        errors: [{ messageId: 'preferNative' }],
      },
      {
        code: 'const PKG = "blueimp-md5";\nexport const md5 = require(PKG);',
        errors: [{ messageId: 'preferNative' }],
      },
      {
        code: 'export const sjcl = require(`sjcl`);',
        errors: [{ messageId: 'preferNative' }],
      },
      // The digest packages added to the list, each a pure-JS reimplementation
      // of a primitive node:crypto exposes.
      { code: 'const md5 = require("md5");', errors: [{ messageId: 'preferNative' }] },
      { code: 'import shajs from "sha.js";', errors: [{ messageId: 'preferNative' }] },
      { code: 'const hash = require("hash.js");', errors: [{ messageId: 'preferNative' }] },
      { code: 'import sha1 from "js-sha1";', errors: [{ messageId: 'preferNative' }] },
      // The password-hash message keeps its own path through the new listener.
      {
        code: 'export async function f() { return import("bcryptjs"); }',
        errors: [{ messageId: 'preferNativePasswordHash' }],
      },
    ],
  });

  describe('Layer 2: synthetic ImportDeclaration', () => {
    it('ignores an import whose source value is not a string', () => {
      const { listeners, reports } = createWithMockContext(
        preferNativeCrypto as never
      );
      (listeners.ImportDeclaration as (n: unknown) => void)({
        type: 'ImportDeclaration',
        source: { type: 'Literal', value: null },
        specifiers: [],
      });
      expect(reports).toHaveLength(0);
    });
  });
});
