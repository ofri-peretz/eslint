/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * An error code is not a credential, and a build-tool path template is not one
 * either.
 *
 * Both were found on 2026-09-01, the first hour the corpus scan could see
 * again — it had reported "every target failed to scan" for two days while
 * ESLint's findings were being discarded (#811). These were the two findings
 * over budget, at CWE-798 / CVSS 9.8 / CRITICAL, tagged SOC2 PCI-DSS HIPAA
 * GDPR, in two authentication libraries:
 *
 *   auth0/express-openid-connect  lib/errors.js:25
 *     MTLS_INCOMPATIBLE_CLIENT_AUTH: 'mtls_incompatible_client_auth'
 *
 *   okta/okta-auth-js  jest.cjs.js:15
 *     const OktaAuth = '<rootDir>/build/cjs/exports/default.js'
 *
 * Two different gaps, both in the value guards rather than the name gate.
 *
 * `isNaturalWordString` demands every ≥3-character token carry a vowel. `mtls`
 * does not — nor do `jwt`, `xhr`, `sql`, `ssh`. One abbreviation inside four
 * dictionary words made the whole identifier read as opaque.
 *
 * `isUrlOrPath` accepts a scheme or a leading `/`. Jest writes `<rootDir>/…`
 * and webpack writes `[name]/…`; the templated root is not a segment it can
 * parse, so the path never reached the path guard at all.
 *
 * The key fixtures carry a real key's SHAPE — a prefix, mixed case, digits —
 * with deliberately non-vendor prefixes. The first draft used Stripe's
 * canonical documentation key and GitHub push protection rejected the branch;
 * so did the second, because the detector matches the `sk_live_` PREFIX and
 * changing the suffix achieves nothing. Correct of it, and the unblock URL is
 * not the answer for a test fixture.
 *
 * The non-vendor prefixes are load-bearing, not a workaround, and a future
 * reader should not "restore" them. `credential-fixture-shape.test.ts` is
 * right that the prefix is the published contract these rules detect — but a
 * real `sk_live_` value is matched STRUCTURALLY by `looksLikeCredential` and
 * returns before shape is ever consulted, so it would never reach the guard
 * these cases exist to exercise. Every one of them would pass with the fix
 * removed: vacuous.
 *
 * Vendor-format detection is covered by `credential-words-option.test.ts`.
 * What THESE cases assert is narrower: a value carrying DIGITS keeps the vowel
 * requirement. That is a property of the shape, and it needs a value that
 * reaches the shape test.
 *
 * The abbreviation allowance is deliberately at the STRING level. Waiving the
 * vowel per-token accepted `zdp` inside `vnd_live_7dQ82JmXzKvNbRt4Wy6Lp3Fa` and
 * skipped a real Stripe key — caught by the true-positive cases below before it
 * shipped. A value carrying any digit is a key shape and keeps the vowel rule.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-hardcoded-credentials — an abbreviation is not entropy',
  noHardcodedCredentials,
  {
    valid: [
      // auth0/express-openid-connect, verbatim.
      `const codes = Object.freeze({
         MTLS_INCOMPATIBLE_CLIENT_AUTH: 'mtls_incompatible_client_auth',
       });`,
      // The same shape with other abbreviations code is full of — bound to
      // names that DO open the credential gate, so each case exercises the
      // value guard rather than passing because the rule never looked.
      //
      // The first draft used `JWT_SIGNATURE_INVALID` and friends as object
      // keys. All three passed with the guard removed: the gate never opened,
      // so they proved nothing. The second draft fixed the names and two were
      // STILL vacuous — `xhr_request_failed` and `ssh_auth_rejected` are too
      // short to be secret-shaped, so the guard was never what silenced them.
      // Each case here was checked in BOTH directions — silent with the guard,
      // reporting without it. A third draft used `ssh_tunnel_handshake_rejected`
      // and it failed WITH the fix: `handshake` carries the consonant run
      // `ndsh`, so it fails `isPronounceable` for a reason that predates this
      // change. Checking only the without-guard direction had missed that.
      `const authToken = 'jwt_signature_invalid';`,
      `const apiSecret = 'ssh_tunnel_setup_rejected';`,
      `const clientSecret = 'xhr_transport_layer_failure';`,
      `const apiSecret = 'sql_migration_lock_timeout';`,

      // okta/okta-auth-js, verbatim.
      `const OktaAuth = '<rootDir>/build/cjs/exports/default.js';`,
      // The bundler spelling of the same thing.
      `const authChunk = '[name]/vendor/auth.js';`,
    ],
    invalid: [
      // The abbreviation allowance must not reach a key. Every one of these
      // carries a digit, which is what keeps the vowel requirement in force.
      {
        code: `const stripeSecret = 'vnd_live_7dQ82JmXzKvNbRt4Wy6Lp3Fa';`,
        errors: 1,
      },
      {
        code: `const githubToken = 'pat_16C7e42F292c6912E7710c838347Ae178B4a';`,
        errors: 1,
      },
      {
        code: `const googleApiKey = 'AbcDeFgHiJkLmNoPqRsTuVwXyZ1234567890';`,
        errors: 1,
      },
      // A templated ROOT is stripped; an opaque segment after it is not a path.
      {
        code: `const authSecret = '<rootDir>/K2n8Qv4xRtL9pWmZ3yBc7Hd5Fj1Ns6Ae0Ug';`,
        errors: 1,
      },
    ],
  },
);
