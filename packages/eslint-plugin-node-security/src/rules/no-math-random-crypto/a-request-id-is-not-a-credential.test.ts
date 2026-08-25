/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A correlation id is not a credential.
 *
 * Hand-verification run 2026-08-24 against arangodb/arangojs. One finding in
 * the entire repository, `src/lib/util.ts:77`:
 *
 *   /** @internal Generate a unique request ID. *\/
 *   export function generateRequestId() {
 *     return `${Date.now() % THIRTY_MINUTES}_${Math.random().toString(36).substring(2, 15)}`;
 *   }
 *
 * reported at CWE-338, CVSS 5.3, CRITICAL. The value is what the driver puts
 * in a log line to match a response back to its request; predicting it grants
 * nothing, and the doc comment above it says so.
 *
 * `/generate.*id/i` is the loosest entry in CRYPTO_FUNCTION_PATTERNS and it
 * matches the most common identifier factory in Node. The fix is subtraction
 * in the shape the rule already uses for `code` and `key`: an id qualified by
 * a correlation word is ruled out, and nothing new is ruled in.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noMathRandomCrypto } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-math-random-crypto — a correlation id is not a credential',
  noMathRandomCrypto,
  {
    valid: [
      // The corpus shape.
      `const THIRTY_MINUTES = 1800000;
       export function generateRequestId() {
         return \`\${Date.now() % THIRTY_MINUTES}_\${Math.random().toString(36).substring(2, 15)}\`;
       }`,
      // The rest of the correlation family, same argument.
      `function generateCorrelationId() { return Math.random().toString(36).slice(2); }`,
      `function generateTraceId() { return Math.random().toString(36).slice(2); }`,
      `function generateMessageId() { return Math.random().toString(36).slice(2); }`,
      `function generateElementId() { return Math.random().toString(36).slice(2); }`,
      // IGNF/cartes.gouv.fr-entree-carto — the French national geoportal, and
      // one of our adopters. The author reaches for the CSPRNG first and falls
      // back only where it is absent; reporting the fallback tells them
      // nothing they have not already written down.
      `function generateToken() {
         if (window.crypto && window.crypto.getRandomValues) {
           const bytes = new Uint8Array(16);
           window.crypto.getRandomValues(bytes);
           return Array.from(bytes, (b) => b.toString(16)).join('');
         }
         return \`\${Date.now()}-\${Math.random().toString(16).slice(2)}\`;
       }`,
      // Destructured, so the CSPRNG call is a bare identifier rather than a
      // member expression — the same fallback, spelled the way Node code
      // usually imports it.
      `const { randomBytes } = require('crypto');
       function generateApiKey() {
         try {
           return randomBytes(24).toString('hex');
         } catch (e) {
           return Math.random().toString(36).slice(2);
         }
       }`,
      // Node's spelling of the same shape.
      `function makeSecret() {
         try {
           return require('crypto').randomBytes(16).toString('hex');
         } catch (e) {
           return String(Math.random());
         }
       }`,
    ],

    invalid: [

      // A computed callee names nothing the rule can read, so the call ahead of

      // the token is not evidence of a CSPRNG and the finding stands.

      {

        code: `function generateToken(helpers, key) {

           helpers[key]();

           return Math.random().toString(36).slice(2);

         }`,

        errors: [{ messageId: 'mathRandomCrypto' as const }],

      },

      // Neither is an immediately-invoked function expression.

      {

        code: `function generateSecret() {

           (function warmUp() {})();

           return Math.random().toString(36).slice(2);

         }`,

        errors: [{ messageId: 'mathRandomCrypto' as const }],

      },
      // A session id IS the credential — `session` is not a correlation word,
      // and this is the false negative the subtraction must not open.
      {
        code: `function generateSessionId() { return Math.random().toString(36).slice(2); }`,
        errors: 1,
      },
      // A crypto word outranks the correlation word. `generateRequestTokenId`
      // contains `request`, but it also contains `token` and matches
      // /generate.*token/i on its own — review caught that the subtraction was
      // suppressing a match it was never asked to judge. Written without a
      // return, so no later context can restore the finding.
      {
        code: `function generateRequestTokenId() { const v = Math.random().toString(36).slice(2); store(v); }`,
        errors: 1,
      },
      // Neither is a user id used as a bearer value, or a bare id factory with
      // nothing qualifying it.
      {
        code: `function generateId() { return Math.random().toString(36).slice(2); }`,
        errors: 1,
      },
      // The other patterns are untouched.
      {
        code: `function generateApiToken() { return Math.random().toString(36).slice(2); }`,
        errors: 1,
      },
    ],
  },
);
