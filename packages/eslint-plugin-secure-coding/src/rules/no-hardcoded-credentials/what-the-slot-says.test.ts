/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * What the slot a value sits in can and cannot change.
 *
 * The rule decides on the VALUE, and the slot's name is the second signal: it
 * promotes an ambiguous value (tier 2), it exempts a value that only restates
 * the slot or sits in a table of UI text, it picks which `detect*` option
 * governs a finding, and it identifies a vendor's publishable key. Each of
 * those readings is pinned here with a control on the same shape.
 *
 * Fixture values follow the repo's push-protection constraint: vendor-prefixed
 * values carry an obviously fake body (never the word `example`, which is a
 * placeholder word and would suppress the value for the wrong reason), and the 32-character blob `K` is a
 * random-looking string that matches no vendor's format.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import { noHardcodedCredentials } from './index';

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

/** Tier 1 by shape alone: 32 random alphanumerics, mixed case, digits. */
const K = 'K7mQx2LpVbNrZs4TyWdHgJc9FaEuXoRi';
/** Secret-shaped but no format: reported only from a credential-named slot. */
const PW = 'aaAA@123';
/** A 25-character random blob: tier 2, needs a credential-named slot. */
const MID = 'fyFGb7ywyM37TqDY8nuhAmGW5';

const REPORTED = [
  { messageId: 'useEnvironmentVariable' as const, suggestions: 2 },
];

const typed = (credentialType: string, envVarName: string) => [
  {
    messageId: 'useEnvironmentVariable' as const,
    data: { credentialType, envVarName },
    suggestions: 2,
  },
];

ruleTester.run(
  'no-hardcoded-credentials — UI text and echoes',
  noHardcodedCredentials,
  {
    valid: [
      {
        name: 'a key chosen at runtime names no slot, whatever its variable is called',
        code: `const settings = { [password]: '${PW}' };`,
      },
      {
        name: 'a table bound to a name ending in `Label` holds UI text',
        code: `const fieldLabel = { password: '${PW}' };`,
      },
      {
        name: 'a table bound to a name ending in `Labels` holds UI text',
        code: `const fieldLabels = { password: '${PW}' };`,
      },
      {
        name: 'a table bound to a name ending in `Name` holds UI text',
        code: `const displayName = { password: '${PW}' };`,
      },
      {
        name: 'a list of tables bound to a name ending in `Placeholder` holds UI text',
        code: `const inputPlaceholder = [{ password: '${PW}' }];`,
      },
      {
        name: 'a value that restates its own slot name is a code, not a credential',
        code: `const sha256Secret = 'SHA256_SECRET';`,
      },
      {
        name: 'a constant named after its own common-password value is a code, not a password',
        code: `const PASSWORD = 'password';`,
      },
      {
        name: 'an assignment to a plain variable restates its slot the same way',
        code: `let sha256Secret; sha256Secret = 'SHA256_SECRET';`,
      },
      {
        name: 'a destructuring target names no slot, and reading it does not throw',
        code: `const [first, second] = 'ab'; const [head] = ['${PW}']; let a; [a] = 'xy';`,
      },
    ],
    invalid: [
      {
        name: 'a label-named binding exempts only its own table, not a credential slot inside it',
        code: `const fieldLabels = { form: { password: '${PW}' } };`,
        errors: REPORTED,
      },
      {
        name: 'a table bound to an ordinary name is not UI text',
        code: `const settings = { password: '${PW}' };`,
        errors: REPORTED,
      },
      {
        name: 'an assignment to a credential-named plain variable is a credential slot',
        code: `let dbPassword; dbPassword = '${PW}';`,
        errors: REPORTED,
      },
      {
        name: "a computed key ['password'] declares the same credential slot as the bare one",
        code: `const settings = { ['password']: '${PW}' };`,
        errors: REPORTED,
      },
      {
        name: 'a template-literal computed key declares the same credential slot as the bare one',
        code: `const settings = { [\`password\`]: '${PW}' };`,
        errors: REPORTED,
      },
    ],
  },
);

ruleTester.run(
  'no-hardcoded-credentials — slot and shape',
  noHardcodedCredentials,
  {
    valid: [
      {
        name: 'a 25-character blob in an unnamed slot is tier 2 and needs a credential name',
        code: `const sessionId = '${MID}';`,
      },
      {
        name: 'a tier-2 blob in a template literal is not reported either',
        code: `const sessionId = \`${MID}\`;`,
      },
      {
        name: 'a tier-2 blob in one part of an interpolated template is not reported',
        code: 'const sessionId = `${prefix}' + MID + '`;',
      },
      {
        name: 'a sentence in a password slot is a prompt, not a password',
        code: `const password = 'Must contain at least one number';`,
      },
      {
        name: 'a value shorter than minLength is not a credential',
        code: `const password = 'aB3$';`,
      },
      {
        name: 'a structural key in a template literal in a test file is exempt like a string',
        code: 'const key = `AKIAIOSFODNN7EXAMPLE`;',
        filename: 'src/aws.test.ts',
      },
      {
        name: 'an AKIA prefix longer than an access key id is not one',
        code: `const ref = 'AKIAIOSFODNN7EXAMPLE2';`,
      },
      {
        name: 'minLength above a key length silences the structural match',
        code: `const k = 'AKIAIOSFODNN7EXAMPLE';`,
        options: [{ minLength: 64 }],
      },
      {
        name: 'ignorePatterns silences a structural match',
        code: `const k = 'AKIAIOSFODNN7EXAMPLE';`,
        options: [{ ignorePatterns: ['^AKIA[A-Z0-9]*EXAMPLE$'] }],
      },
      {
        name: 'ignorePatterns silences a secret-shaped value in a credential slot',
        code: `const password = 'test-Passw0rd!';`,
        options: [{ ignorePatterns: ['^test-'] }],
      },
      {
        name: 'a custom pattern reports only what it matches',
        code: `const greeting = 'hello';`,
        options: [
          { customPatterns: [{ type: 'Internal token', pattern: '^itk_' }] },
        ],
      },
      {
        // @found mutation testing
        name: 'FP: a dynamic route segment mid-path is still a route',
        code: `const authPaths = { callbackToken: '/auth/[provider]/token' };`,
      },
    ],
    invalid: [
      {
        name: 'a JWT is tier 1: reported in an unnamed slot',
        code: `const header = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJlMDA';`,
        errors: typed('JWT token', 'HEADER'),
      },
      {
        name: 'a GitHub token is tier 1: reported in an unnamed slot',
        code: `const header = 'ghp_1234567890123456789012345678901234567890';`,
        errors: typed('OAuth token', 'HEADER'),
      },
      {
        name: 'minLength equal to a key length still reports it',
        code: `const k = 'AKIAIOSFODNN7EXAMPLE';`,
        options: [{ minLength: 20 }],
        errors: typed('AWS access key', 'K'),
      },
      {
        name: 'padded base64 of 32+ characters is a secret key',
        code: `const secret = 'bm90LWEtcmVhbC1zZWNyZXQtdmFsdWUtZm9yLXRlc3RzMQ==';`,
        errors: typed('Secret key', 'SECRET'),
      },
      {
        name: 'a 32+ character token with underscores is an API key',
        code: `const apiKey = 'live_9f8e7d6c5b4a39281706f5e4d3c2b1a0x';`,
        errors: typed('API key', 'API_KEY'),
      },
      {
        name: 'a custom pattern names the credential type it reports',
        code: `const t = 'itk_abc';`,
        options: [
          { customPatterns: [{ type: 'Internal token', pattern: '^itk_' }] },
        ],
        errors: typed('Internal token', 'T'),
      },
      {
        name: 'a plural credential name is a credential slot',
        code: `const passwords = ['${PW}'];`,
        errors: REPORTED,
      },
      {
        name: '`keys` holding a random blob is a credential slot',
        code: `const keys = ['${MID}'];`,
        errors: REPORTED,
      },
      {
        name: 'a structural key reaches a destructuring target, and naming it does not throw',
        code: `const [first] = 'AKIAIOSFODNN7EXAMPLE';`,
        errors: typed('AWS access key', 'API_KEY'),
      },
    ],
  },
);

/**
 * The context-positive path is gated by the `detect*` option for the category
 * the slot's name falls in. A name's category is read from its LAST
 * separator-delimited word, so `reset_password_token` is a token and
 * `oauth_token_secret` an API secret.
 */
ruleTester.run(
  'no-hardcoded-credentials — the slot picks the option',
  noHardcodedCredentials,
  {
    valid: [
      {
        name: 'detectPasswords:false silences a separator-joined password name',
        code: `const db_password = '${PW}';`,
        options: [{ detectPasswords: false }],
      },
      {
        name: 'detectPasswords:false silences a password list too',
        code: `const passwords = ['${PW}'];`,
        options: [{ detectPasswords: false }],
      },
      {
        name: 'detectTokens:false silences a separator-joined token name',
        code: `const github_token = '${PW}';`,
        options: [{ detectTokens: false }],
      },
      {
        name: 'detectDatabaseStrings:false silences a separator-joined database name',
        code: `const replica_db_url = '${PW}';`,
        options: [{ detectDatabaseStrings: false }],
      },
      {
        name: 'detectApiKeys:false silences an API-key name',
        code: `const api_key = '${PW}';`,
        options: [{ detectApiKeys: false }],
      },
      {
        name: 'detectApiKeys:false silences a bare `secret`',
        code: `const secret = '${PW}';`,
        options: [{ detectApiKeys: false }],
      },
      {
        name: 'detectApiKeys:false silences a separator-joined secret name',
        code: `const jwt_secret = '${PW}';`,
        options: [{ detectApiKeys: false }],
      },
    ],
    invalid: [
      {
        name: 'a token name that mentions a password is governed by detectTokens',
        code: `const reset_password_token = '${PW}';`,
        options: [{ detectPasswords: false }],
        errors: REPORTED,
      },
      {
        name: 'a secret name that mentions a token is governed by detectApiKeys',
        code: `const oauth_token_secret = '${PW}';`,
        options: [{ detectTokens: false }],
        errors: REPORTED,
      },
      {
        name: 'a secret name that mentions a database url is governed by detectApiKeys',
        code: `const db_url_secret = '${PW}';`,
        options: [{ detectDatabaseStrings: false }],
        errors: REPORTED,
      },
      {
        name: 'detectDatabaseStrings:false does not silence an API-key name',
        code: `const api_key = '${PW}';`,
        options: [{ detectDatabaseStrings: false }],
        errors: REPORTED,
      },
      {
        name: 'a credential name of no category is always honoured',
        code: `const credentials = '${PW}';`,
        options: [{ detectApiKeys: false }],
        errors: REPORTED,
      },
      {
        name: 'a credentials name that starts with `secret` is still of no category',
        code: `const secret_credentials = '${PW}';`,
        options: [{ detectApiKeys: false }],
        errors: REPORTED,
      },
      {
        name: 'a token name is reported by default',
        code: `const github_token = '${PW}';`,
        errors: REPORTED,
      },
      {
        name: 'a database name is reported by default',
        code: `const replica_db_url = '${PW}';`,
        errors: REPORTED,
      },
    ],
  },
);

/**
 * Publishable keys: every slot shape the rule reads a name from, every SDK
 * specifier that identifies a vendor, and the exact publishable slot name.
 */
ruleTester.run(
  'no-hardcoded-credentials — which slot is publishable',
  noHardcodedCredentials,
  {
    valid: [
      {
        name: 'a vendor-named property is a publishable slot',
        code: `const config = { bugsnagApiKey: '9e1e6889176fd0c795d5c659225e0fae' };`,
      },
      {
        name: 'a vendor-named string key is a publishable slot',
        code: `const config = { 'bugsnagApiKey': '9e1e6889176fd0c795d5c659225e0fae' };`,
      },
      {
        name: 'a vendor-named member assignment is a publishable slot',
        code: `config.bugsnagApiKey = '9e1e6889176fd0c795d5c659225e0fae';`,
      },
      {
        name: 'a vendor-named plain assignment is a publishable slot',
        code: `let bugsnagApiKey; bugsnagApiKey = '9e1e6889176fd0c795d5c659225e0fae';`,
      },
      {
        name: 'the bugsnag package identifies Bugsnag',
        code: `import Bugsnag from 'bugsnag';\nconst apiKey = '${K}';`,
      },
      {
        name: 'the @bugsnag scope identifies Bugsnag',
        code: `import Bugsnag from '@bugsnag/js';\nconst apiKey = '${K}';`,
      },
      {
        name: "Bugsnag's notifier key is publishable",
        code: `import Bugsnag from '@bugsnag/js';\nconst notifierKey = '${K}';`,
      },
      {
        name: 'the @sentry scope identifies Sentry, whose DSN is publishable',
        code: `import * as Sentry from '@sentry/node';\nconst dsn = '${K}';`,
      },
      {
        name: 'analytics-node identifies Segment',
        code: `import Analytics from 'analytics-node';\nconst writeKey = '${K}';`,
      },
      {
        name: "PostHog's plain api key slot is publishable",
        code: `import posthog from 'posthog-js';\nconst apiKey = '${K}';`,
      },
      {
        name: "PostHog's project key slot is publishable",
        code: `import posthog from 'posthog-js';\nconst projectKey = '${K}';`,
      },
      {
        name: 'amplitude-js identifies Amplitude',
        code: `import amplitude from 'amplitude-js';\nconst apiKey = '${K}';`,
      },
      {
        name: 'the @amplitude scope identifies Amplitude',
        code: `import * as amp from '@amplitude/analytics-browser';\nconst apiKey = '${K}';`,
      },
      {
        name: "Amplitude's vendor-named key slot is publishable",
        code: `const amplitudeKey = '${K}';`,
      },
      {
        name: "Mixpanel's plain token slot is publishable",
        code: `import mixpanel from 'mixpanel-browser';\nconst token = '${K}';`,
      },
      {
        name: 'the firebase package identifies Firebase',
        code: `import { initializeApp } from 'firebase';\nconst apiKey = '${K}';`,
      },
      {
        name: 'the @firebase scope identifies Firebase',
        code: `import { initializeApp } from '@firebase/app';\nconst webApiKey = '${K}';`,
      },
    ],
    invalid: [
      ...[
        ['@bugsnag/js', 'serverApiKey'],
        ['@bugsnag/js', 'apiKeyId'],
        ['@sentry/node', 'serverDsn'],
        ['@sentry/node', 'dsnId'],
        ['posthog-js', 'serverApiKey'],
        ['posthog-js', 'apiKeyId'],
        ['@segment/analytics-next', 'serverWriteKey'],
        ['@segment/analytics-next', 'writeKeyId'],
        ['@amplitude/analytics-browser', 'serverApiKey'],
        ['@amplitude/analytics-browser', 'apiKeyId'],
        ['mixpanel-browser', 'serverToken'],
        ['mixpanel-browser', 'tokenId'],
        ['@firebase/app', 'serverApiKey'],
        ['@firebase/app', 'apiKeyId'],
      ].map(([specifier, slot]) => ({
        name: `a vendor's publishable slot is the whole name: ${slot} beside ${specifier} is not it`,
        code: `import vendor from '${specifier}';\nconst ${slot} = '${K}';`,
        errors: REPORTED,
      })),
      ...[
        ['an OpenAI-style sk- key', 'sk-FIXTURExNOTxLIVEx0000xVALUEx1234'],
        ['a Sentry org token', 'sntrys_FIXTURE_NOT_LIVE_0000_VALUE_1234'],
        ['a Sentry user token', 'sntryu_FIXTURE_NOT_LIVE_0000_VALUE_1234'],
        ['a Slack bot token', 'xoxb-FAKE-NOT-LIVE-0000-VALUE-1234'],
        ['a Stripe restricted key', 'rk_live_EXAMPLE_NOT_A_REAL_KEY_000'],
        ['a JWT', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJlMDA'],
        ['a private key block', '-----BEGIN-FIXTURE-NOT-LIVE-0000-VALUE-1234'],
      ].map(([what, value]) => ({
        name: `${what} in a publishable slot is still a secret`,
        code: `import Bugsnag from '@bugsnag/js';\nconst bugsnagApiKey = '${value}';`,
        errors: REPORTED,
      })),
    ],
  },
);
