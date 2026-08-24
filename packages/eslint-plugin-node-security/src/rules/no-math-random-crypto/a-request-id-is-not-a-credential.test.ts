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
    ],
    invalid: [
      // A session id IS the credential — `session` is not a correlation word,
      // and this is the false negative the subtraction must not open.
      {
        code: `function generateSessionId() { return Math.random().toString(36).slice(2); }`,
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
