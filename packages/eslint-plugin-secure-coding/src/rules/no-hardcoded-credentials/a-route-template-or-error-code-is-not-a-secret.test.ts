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
import { afterAll, describe, it } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-hardcoded-credentials — a route template or error code is not a secret',
  noHardcodedCredentials,
  {
    valid: [
      // The Teable shape.
      {
        name: 'an OpenAPI path template under a TOKEN name is a route, not a secret',
        code: `export const GET_ACCESS_TOKEN = '/access-token/{id}';`,
      },
      {
        name: 'a path template with a trailing segment is a route',
        code: `export const REFRESH_ACCESS_TOKEN = '/access-token/{id}/refresh';`,
      },
      {
        name: 'a path template with a camelCase slot is a route',
        code: `const apiKeyRoute = '/api-keys/{apiKeyId}/rotate';`,
      },
      // The Hoppscotch shape.
      {
        name: 'a slash-namespaced error code under a TOKEN name is not a secret',
        code: `export const INFRA_TOKEN_INVALID_TOKEN = 'infra_token/invalid_token';`,
      },
      {
        name: 'a two-part lowercase error code is not a secret',
        code: `export const ACCESS_TOKEN_EXPIRED = 'access_token/expired';`,
      },
      {
        name: 'an error code with a hyphen in an object value is not a secret',
        code: `const errors = { secretMissing: 'auth/secret-missing' };`,
      },
      // A part may hold several words.
      {
        name: 'an error code part may hold several underscored words',
        code: `export const AUTH_TOKEN_EXPIRED = 'invalid_auth_token/expired';`,
      },
    ],
    invalid: [
      // A segment in braces is a slot only when it is an identifier.
      {
        name: 'a brace segment that is not an identifier is not a route slot',
        code: `const accessToken = '/token/{aB3xK9mQ2vL8pR4w!}';`,
        errors: 1,
      },
      // Digits are not an error code.
      {
        name: 'a value with digits is not an error code',
        code: `const apiToken = 'tok_live/x9k2m4q8';`,
        errors: 1,
      },
      // A capital at the start or end of a part is not an error code.
      {
        name: 'a capital at the start of a part is not an error code',
        code: `const apiToken = 'Token_x/invalid_token';`,
        errors: 1,
      },
      {
        name: 'a capital at the end of a part is not an error code',
        code: `const apiToken = 'invalid_token/token_X';`,
        errors: 1,
      },
      // Mixed case is not an error code.
      {
        name: 'a mixed-case value is not an error code',
        code: `const apiToken = 'aBcDeF/gHiJkL';`,
        errors: 1,
      },
      // A digit inside one part is not an error code.
      {
        name: 'a digit inside one part is not an error code',
        code: `const authToken = 'invalid_tok9n/x';`,
        errors: 1,
      },
      // A password slot keeps reporting a slash phrase.
      {
        name: 'a slash phrase in a password slot may be a passphrase',
        code: `const password = 'correct/horse/battery';`,
        errors: 1,
      },
    ],
  },
);
