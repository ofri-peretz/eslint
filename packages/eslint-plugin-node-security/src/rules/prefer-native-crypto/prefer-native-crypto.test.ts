/**
 * Tests for prefer-native-crypto rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, expect, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { preferNativeCrypto } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('prefer-native-crypto', () => {
  ruleTester.run('prefer-native-crypto', preferNativeCrypto, {
    valid: [
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
        'const items = [];',
      { code: 'import crypto from "node:crypto";' },
      { code: 'const crypto = require("crypto");' },
    ],
    invalid: [
      {
        code: 'import CryptoJS from "crypto-js";',
        errors: [{ messageId: 'preferNative' }],
      },
      {
        code: 'import sjcl from "sjcl";',
        errors: [{ messageId: 'preferNative' }],
      },
      {
        code: 'import forge from "node-forge";',
        errors: [{ messageId: 'preferNative' }],
      },
      // Subpath imports name the same dependency.
      {
        code: 'import md5 from "crypto-js/md5";',
        errors: [{ messageId: 'preferNative' }],
      },
      {
        code: 'import JSEncrypt from "jsencrypt";',
        errors: [{ messageId: 'preferNative' }],
      },
      {
        code: 'const AES = require("aes-js");',
        errors: [{ messageId: 'preferNative' }],
      },
    ],
  });

  /**
   * HARMFUL-ADVICE lock — bcryptjs must not be told to use node:crypto.
   *
   * `bcryptjs` used to sit in THIRD_PARTY_CRYPTO_LIBS, so importing it produced
   * "Native crypto (Node.js crypto or Web Crypto API) is faster, more secure…
   * Migrate to native crypto module". `node:crypto` has no bcrypt. A developer
   * who followed that message to `createHash('sha256')` would replace a
   * deliberately-slow password hash with a fast one — CWE-916, a worse bug than
   * the CWE-1104 being reported.
   *
   * These cases fail on the unfixed rule with the wrong messageId, which is the
   * point: the rule was not silent, it was confidently wrong.
   */
  ruleTester.run('prefer-native-crypto — password hashing', preferNativeCrypto, {
    valid: [
      // The native binding IS the remedy. Reporting it would send the reader in
      // a circle.
      { code: 'import bcrypt from "bcrypt";' },
      { code: 'const bcrypt = require("bcrypt");' },
      // Argon2id, the other recommended destination.
      { code: 'import argon2 from "argon2";' },
      // A local module that merely shares a prefix. Exact set membership, never
      // a substring test.
      { code: 'import hash from "./bcryptjs-adapter";' },
    ],
    invalid: [
      {
        code: 'import bcrypt from "bcryptjs";',
        errors: [{ messageId: 'preferNativePasswordHash' }],
      },
      {
        code: 'const bcrypt = require("bcryptjs");',
        errors: [{ messageId: 'preferNativePasswordHash' }],
      },
      // The abandoned predecessor, unpublished-adjacent and still widely pinned.
      {
        code: 'import bcrypt from "bcrypt-nodejs";',
        errors: [{ messageId: 'preferNativePasswordHash' }],
      },
    ],
  });

  /**
   * Lock: this rule takes no options.
   *
   * See the note on `Options` in the rule source — the old `severity` setting
   * was accepted by the schema, documented as working, and read by nothing.
   */
  it('declares an empty schema — no inert `severity` option', () => {
    expect(preferNativeCrypto.meta.schema).toEqual([]);
  });
});
