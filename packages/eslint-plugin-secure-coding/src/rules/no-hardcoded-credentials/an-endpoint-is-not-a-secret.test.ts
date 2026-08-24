/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * A route path is the address of a secret, not the secret.
 *
 * Hand-verification run 2026-08-24 against
 * ministryofjustice/hmpps-arns-assessment-platform-ui. Its authentication
 * middleware collects the OAuth endpoints it talks to:
 *
 *   const authPaths = {
 *     handoverToken: '/oauth2/token',
 *     hmppsToken: '/oauth/token',
 *   }
 *
 * Both were reported as `Hard-coded Credential value`, CWE-798, CVSS 9.8,
 * tagged SOC2/PCI-DSS/HIPAA/GDPR — the rule's maximum severity, on a URL
 * path, in a UK Ministry of Justice repository. They were two of the fourteen
 * findings that scan produced.
 *
 * Two independent checks have to agree before the report fires, and both said
 * yes for the wrong reason. `isCredentialContext` opens because the property
 * name ends in `token`; `isSecretShaped` opens because slashes and digits are
 * two character classes. Neither is looking at whether the value could be a
 * secret at all.
 *
 * The guard lives in `isSecretShaped`, which is the half that is supposed to
 * judge the value. Connection strings are the case it must not swallow, and
 * they survive twice over: `looksLikeCredential` matches
 * `protocol://user:pass@host` structurally and returns before shape is
 * consulted, and `isUrlOrPath` refuses any URL carrying userinfo anyway.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-hardcoded-credentials — an endpoint is not a secret',
  noHardcodedCredentials,
  {
    valid: [
      // The corpus shape.
      `const authPaths = { handoverToken: '/oauth2/token', hmppsToken: '/oauth/token' };`,
      // The same path through a variable rather than a property.
      `const tokenPath = '/oauth2/token';`,
      // An absolute URL in a credential-named slot is still an address.
      `const tokenUrl = 'https://auth.example.gov.uk/oauth2/token';`,
      `const apiKeyEndpoint = 'https://api.example.com/v1/api-keys';`,
      // A dunder sentinel is a slot a code generator substitutes later, not a
      // secret — postmanlabs/postman-code-generators declares `trueToken`,
      // `falseToken` and `nullToken` this way across three `parseBody.js`
      // files. Seven findings; the name ends in `token`, the value is a marker.
      `const trueToken = '__PYTHON#%0True__', falseToken = '__PYTHON#%0False__';`,
      `const nullToken = '__RUBY#%0NULL__';`,
      // A path with a query string, which adds a third character class.
      `const secretPath = '/internal/secrets?scope=all';`,
    ],
    invalid: [
      // The case the guard must not swallow: userinfo in the URL is the
      // credential, and it reports whether or not the value is URL-shaped.
      {
        code: `const dbUrl = 'postgres://admin:hunter2@db.internal:5432/app';`,
        errors: 1,
      },
      {
        code: `const cache = 'redis://user:s3cr3tP4ss@cache.internal:6379';`,
        errors: 1,
      },
      // A real secret that happens to start with a slash. `/` is in the
      // base64 alphabet, so this one ALSO matches the structural key pattern —
      // review pointed out that it therefore proves nothing about the path
      // guard, since the structural match returns before shape is consulted.
      {
        code: `const clientSecret = '/K2n8Qv4xRtL9pWmZ3yBc7Hd5Fj1Ns6Ae0Ug';`,
        errors: 1,
      },
      // So here is the case that DOES exercise the guard: one opaque segment,
      // too short for the base64 pattern, reachable only through the shape
      // check. A single leading slash must not be enough to call it a route.
      {
        code: `const clientSecret = '/aB3xK9mQ2vL8';`,
        errors: 1,
      },
      // A real secret is not a sentinel just because something wraps it.
      //
      // Deliberately a short password shape rather than a long key shape: a
      // vendor prefix trips GitHub push protection (documentation key or not)
      // and a 40-char blob trips the repo's secret scanner. A fixture that
      // cannot be committed is a fixture nobody runs.
      {
        code: `const dbPassword = 'aaAA@123';`,
        errors: 1,
      },
      // The wrapped form of the same value. `looksRandom` needs 20 characters
      // before it consults entropy, so the dunder exemption used to accept
      // this — a password suppressed by the punctuation around it.
      {
        code: `const dbPassword = '__aaAA@123__';`,
        errors: 1,
      },
      // A segment carrying characters no route segment carries.
      {
        code: `const apiSecret = '/xK9!mQ2$vL8pR4wZ';`,
        errors: 1,
      },
    ],
  },
);
