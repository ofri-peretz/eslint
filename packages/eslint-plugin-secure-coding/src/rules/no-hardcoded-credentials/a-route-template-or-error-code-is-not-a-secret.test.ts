/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An OpenAPI path template and a slash-namespaced error code are not secrets.
 *
 * Found scanning open-source apps on 2026-11-24:
 *
 *   // teableio/teable, packages/openapi
 *   export const GET_ACCESS_TOKEN = '/access-token/{id}';
 *   // hoppscotch/hoppscotch, packages/hoppscotch-backend/src/errors.ts
 *   export const INFRA_TOKEN_INVALID_TOKEN = 'infra_token/invalid_token';
 *
 * Both names hold `TOKEN`, which opens the credential-context gate, and both
 * values clear the two-character-class test on their slashes, braces and
 * underscores. Each was reported as a CRITICAL CVSS 9.8 hard-coded credential.
 *
 * `{id}` is the OpenAPI spelling of the `[id]` and `<id>` route slots the
 * path guard already accepts. An error code is read by people and matched by
 * clients: lowercase words, no digits, so it can never carry entropy.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-hardcoded-credentials — a route template or error code is not a secret',
  noHardcodedCredentials,
  {
    valid: [
      // The Teable shape.
      `export const GET_ACCESS_TOKEN = '/access-token/{id}';`,
      `export const REFRESH_ACCESS_TOKEN = '/access-token/{id}/refresh';`,
      `const apiKeyRoute = '/api-keys/{apiKeyId}/rotate';`,
      // The Hoppscotch shape.
      `export const INFRA_TOKEN_INVALID_TOKEN = 'infra_token/invalid_token';`,
      `export const ACCESS_TOKEN_EXPIRED = 'access_token/expired';`,
      `const errors = { secretMissing: 'auth/secret-missing' };`,
    ],
    invalid: [
      // A segment in braces is a slot only when it is an identifier.
      {
        code: `const accessToken = '/token/{aB3xK9mQ2vL8pR4w!}';`,
        errors: 1,
      },
      // Digits are not an error code.
      {
        code: `const apiToken = 'tok_live/x9k2m4q8';`,
        errors: 1,
      },
      // Mixed case is not an error code.
      {
        code: `const apiToken = 'aBcDeF/gHiJkL';`,
        errors: 1,
      },
      // A digit inside one part is not an error code.
      {
        code: `const authToken = 'invalid_tok9n/x';`,
        errors: 1,
      },
      // A password slot keeps reporting a slash phrase.
      {
        code: `const password = 'correct/horse/battery';`,
        errors: 1,
      },
    ],
  },
);
