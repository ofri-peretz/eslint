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
      // --- scaffolding for tests is scaffolding ------------------------------
      // City-of-Helsinki/haitaton-ui's only remaining findings were a fake OIDC
      // user in `testUtils/`, whose `session_state` is filled with Math.random().
      // A fixture has no runtime, so it has nothing to make unpredictable.
      {
        code: 'const sessionState = String(`${Math.random()}${Math.random()}`);',
        filename: 'src/domain/auth/testUtils/userTestUtil.ts',
      },
      {
        code: 'const token = Math.random().toString(36);',
        filename: 'src/test-utils/build-user.ts',
      },

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
      // FN GUARD — the exemption is the test directory, not the word "test".
      // `testimonials` is production code and always was.
      {
        code: 'const token = Math.random().toString(36);',
        filename: 'src/testimonials/share-link.ts',
        errors: 1,
      },
      // FN GUARD — turning the option off reports everywhere, including fixtures.
      {
        code: 'const token = Math.random().toString(36);',
        filename: 'src/test-utils/build-user.ts',
        options: [{ allowInTests: false }],
        errors: 1,
      },

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
        {
          code: 'const iv = Math.random();',
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        {
          code: 'const apiKey = Math.random().toString(36);',
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        {
          code: 'const encryptionSeed = Math.random();',
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
      ],
    });
  });

  /**
   * FN lock — the accumulator loop, the commonest insecure token generator.
   *
   * ```js
   * let token = '';
   * for (let i = 0; i < 32; i++) {
   *   token += CHARS[Math.floor(Math.random() * CHARS.length)];
   * }
   * ```
   *
   * This was QUIET. The declarator arm of `isCryptoContext` cannot see it —
   * `let token = ''` initialises to an empty string and `Math.random()` never
   * appears beneath that declarator. Every character comes from the `+=`, whose
   * left side is an `Identifier`, and the AssignmentExpression arm handled only
   * `MemberExpression`. So `const token = Math.random().toString(36)` reported
   * while the textbook loop that produces a real, guessable session token did
   * not.
   *
   * The existing `genRandomString` fixture above passes on the unfixed rule for
   * an unrelated reason — the FUNCTION name matches `/random.*string/i` — which
   * is exactly why it never surfaced this gap. The cases below carry no
   * crypto-named function and no crypto-named declarator; the assignment target
   * is the only evidence in the file.
   */
  describe('accumulator loops', () => {
    ruleTester.run('no-math-random-crypto', noMathRandomCrypto, {
      valid: [
        // The same loop shape accumulating something that is not a credential.
        // `+=` on a neutral name is not evidence of a security decision.
        `let label = ''; for (let i = 0; i < 8; i++) { label += CHARS[Math.floor(Math.random() * CHARS.length)]; }`,
        // Retry jitter accumulated across attempts.
        `let delay = 0; delay += Math.random() * 100;`,
        // An index into a collection.
        `let idx = 0; idx = Math.floor(Math.random() * items.length);`,
      ],
      invalid: [
        // The archetype: a session token built one character at a time.
        {
          code: `const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                 let token = '';
                 for (let i = 0; i < 32; i++) {
                   token += CHARS[Math.floor(Math.random() * CHARS.length)];
                 }`,
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // Same shape, plain `=` inside the loop body rather than `+=`.
        {
          code: `let otp = '';
                 for (let i = 0; i < 6; i++) {
                   otp = otp + String(Math.floor(Math.random() * 10));
                 }`,
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // A password assembled into a pre-declared binding.
        {
          code: `let password;
                 password = Array.from({ length: 12 }, () => POOL[Math.floor(Math.random() * POOL.length)]).join('');`,
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
      ],
    });
  });
});
