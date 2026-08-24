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
      // A protocol-relative URL is not an absolute path, and a real secret
      // that happens to start with a slash still reports on its shape.
      {
        code: `const clientSecret = '/K2n8Qv4xRtL9pWmZ3yBc7Hd5Fj1Ns6Ae0Ug';`,
        errors: 1,
      },
    ],
  },
);
