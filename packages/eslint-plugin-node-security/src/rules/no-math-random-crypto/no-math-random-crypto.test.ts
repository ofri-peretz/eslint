/**
 * Tests for no-math-random-crypto rule
 * CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator
 *
 * Includes the fn-fp benchmark fixtures
 * (vuln_random_token / vuln_random_session true positives + safe_random_shuffle
 * no-false-positive) so the 40/40, 0-FP benchmark result stays locked.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMathRandomCrypto } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-math-random-crypto', () => {
  ruleTester.run('no-math-random-crypto', noMathRandomCrypto, {
    valid: [
      // Non-crypto variable names — benign randomness
      { code: 'const count = Math.random() * 10;' },
      { code: 'const position = Math.random();' },
      { code: 'const x = Math.random() * width;' },
      { code: 'const index = Math.floor(Math.random() * array.length);' },
      // Secure alternative
      { code: 'const token = crypto.randomBytes(32).toString("hex");' },
      // Benchmark FP lock: Fisher-Yates shuffle assigns to a non-crypto var (`j`)
      // and is not returned from a crypto-named function — must NOT flag.
      {
        code: `export function safe_random_shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}`,
      },
      // Allowed in test files when opted in
      {
        code: 'const secret = Math.random();',
        filename: 'thing.test.ts',
        options: [{ allowInTests: true }],
      },
    ],

    invalid: [
      // Crypto-named variable
      {
        code: 'const token = Math.random().toString(36);',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      {
        code: 'const sessionSecret = Math.random();',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      // Benchmark TP lock: vuln_random_token (returned from a crypto-named fn)
      {
        code: `export function vuln_random_token() {
  return Math.random().toString(36).substring(2);
}`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      // Benchmark TP lock: vuln_random_session
      {
        code: `export function vuln_random_session() {
  return "session_" + Math.floor(Math.random() * 1000000);
}`,
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
      // Crypto-named object property
      {
        code: 'const config = { apiKey: Math.random().toString(36) };',
        errors: [{ messageId: 'mathRandomCrypto' }],
      },
    ],
  });

  // ── The narrowing ──────────────────────────────────────────────────────
  // Every `valid` case is a verbatim shape from the 8-repo corpus scan and
  // reported before this change; every `invalid` case is a TRUE POSITIVE the
  // narrowing had to leave standing.
  describe('Selection And Jitter Are Not Crypto', () => {
    ruleTester.run('a security use is required', noMathRandomCrypto, {
      valid: [
        // redis/ioredis lib/cluster/util.ts:139 — weighted DNS SRV selection.
        // Reported only because the local is called `random`.
        `export function weightSrvRecords(recordsGroup) {
           const random = Math.floor(Math.random() * (recordsGroup.totalWeight + recordsGroup.records.length));
           return random;
         }`,
        // Shopify/cli packages/cli-kit/src/public/common/array.ts:12.
        `export function takeRandomFromArray(array) { return array[Math.floor(Math.random() * array.length)]; }`,
        // okta/okta-signin-widget playground/mocks/server.js:21 — retry jitter.
        `function getRandomDelay([min, max]) { return Math.floor(Math.random() * (max - min) + min); }`,
        // okta/okta-signin-widget .../chosen.jquery.js:343 — one character of a
        // DOM id.
        `AbstractChosen.prototype.generate_random_char = function () {
           var chars = '0123456789ABCDEF';
           var rand = Math.floor(Math.random() * chars.length);
           return chars.substring(rand, rand + 1);
         };`,
        // The substring trap this rule was carrying unfired: `/iv/i` matched
        // `div`, `/pin/i` matched `spinner`, `/key/i` matched `monkey`.
        `const div = Math.random();`,
        `const spinnerFrame = Math.floor(Math.random() * 4);`,
        `const monkeyIndex = Math.floor(Math.random() * 10);`,
      ],
      invalid: [
        // TRUE POSITIVE, preserved. okta/okta-auth-js lib/util/misc.ts:21 —
        // `genRandomString` is called by `generateState()` and
        // `generateNonce()` in lib/oidc/util/oauth.ts:18,22. OAuth state and
        // nonce built on Math.random is exactly CWE-338.
        {
          code: `export function genRandomString(length) {
                   var randomCharset = 'abcdefABCDEF0123456789';
                   var random = '';
                   for (var c = 0, cl = randomCharset.length; c < length; ++c) {
                     random += randomCharset[Math.floor(Math.random() * cl)];
                   }
                   return random;
                 }`,
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // The word-boundary form still matches the real names.
        { code: 'const iv = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'const apiKey = Math.random().toString(36);', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'const encryptionSeed = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
      ],
    });
  });
});
