/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A route is not a credential.
 *
 * `DEFAULT_NON_SECRET_TAILS` already carried `address` on the reasoning that a
 * trailing word can mark a value as a LOCATION rather than a secret. The rest
 * of that idea was missing, and the gap showed up on the pinned corpus
 * (2026-08-20) in Shopify/cli's OAuth callback server:
 *
 *   if (requestUrl.pathname !== STORE_AUTH_CALLBACK_PATH) { … 404 … }
 *
 * `requestUrl` derives from `req.url`, so one operand is attacker-readable and
 * the other is not — which is the taint shape this rule reports. The name
 * carries `auth` because it belongs to an auth FLOW; the value is a route, and
 * timing a route match leaks nothing. CWE-208 at CVSS 5.9 on request routing.
 *
 * `url` and `uri` are deliberately NOT tails: a presigned URL carries its
 * signature in the query string and IS a secret, so `signedUrl === expected`
 * has to keep reporting.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noTimingUnsafeCompare } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/**
 * The name logic is pinned through `reportUnverifiedComparisons`, exactly as
 * the main suite does it. By default the rule ALSO requires an attacker-
 * controlled operand, so a name-only case would pass for the wrong reason and
 * prove nothing about the tail list.
 */
const NAME_ONLY = [{ reportUnverifiedComparisons: true }];

ruleTester.run('no-timing-unsafe-compare — location tails', noTimingUnsafeCompare, {
  valid: [
    {
      // The corpus shape, under DEFAULT options — one operand attacker-readable
      // via req.url, the other a route constant. This is what fired.
      name: 'routing an attacker-supplied pathname against a route constant',
      code: `const STORE_AUTH_CALLBACK_PATH = '/callback';
             export function handle(req) {
               const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
               return requestUrl.pathname !== STORE_AUTH_CALLBACK_PATH;
             }`,
    },
    {
      name: 'a route constant is not a secret, name-only',
      code: 'if (p === STORE_AUTH_CALLBACK_PATH) route();',
      options: NAME_ONLY,
    },
    {
      name: 'an auth endpoint is a location',
      code: 'if (p === AUTH_ENDPOINT) route();',
      options: NAME_ONLY,
    },
    {
      name: 'an auth host is a location',
      code: 'if (h === AUTH_HOST) connect();',
      options: NAME_ONLY,
    },
  ],
  invalid: [
    {
      // FN GUARD: the same name with a SECRET tail. This is what proves the
      // tail does the excluding, not the `auth` word.
      name: 'STORE_AUTH_CALLBACK_TOKEN still reports',
      code: 'if (userToken === STORE_AUTH_CALLBACK_TOKEN) grant();',
      options: NAME_ONLY,
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
    {
      // FN GUARD for the deliberate omission. `url` is NOT a tail, because a
      // presigned URL carries its signature in the query string and IS the
      // credential. `signatureUrl` matches `signature` and ends in `url`, so
      // adding `url` to the tails would silence it.
      //
      // Note the name: `signedUrl` does NOT work here, because `signed` is not
      // among the secret patterns — only `signature` is. I used `signedUrl`
      // first and it passed for the wrong reason.
      name: 'a signature url still reports',
      code: 'if (signatureUrl === expected) grant();',
      options: NAME_ONLY,
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
    {
      // FN GUARD: the canonical shape from the main suite, untouched.
      name: 'an api token still reports',
      code: 'if (userToken === process.env.API_TOKEN) grant();',
      options: NAME_ONLY,
      errors: [{ messageId: 'timingUnsafeCompare' }],
    },
  ],
});
