/**
 * @fileoverview Tests for no-credentials-in-query-params
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noCredentialsInQueryParams } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-credentials-in-query-params', noCredentialsInQueryParams, {
  valid: [
    // Safe URLs without credentials
    {
      name: 'a URL with no credential in it',
      code: "const url = 'https://api.example.com/data'",
    },
    {
      name: 'a user name in the query string is not a credential',
      code: "const url = 'https://api.example.com?user=john'",
    },
    {
      name: 'a fetch URL with no query string',
      code: "fetch('https://api.example.com/users')",
    },
    { code: 'const x = 1', name: 'a numeric constant builds no URL' },

    // --- A template is not a URL just because it contains "token=" ----------
    // Shopify/cli session-lifecycle.ts:56. A DEBUG LOG whose value is
    // explicitly masked. The old branch read `sourceCode.getText(node)` — the
    // template's own SOURCE, interpolations included — and required no `?`/`&`
    // prefix, so `: token=${maskToken(t)}` matched. Wrong twice: not a URL,
    // and the value is redacted.
    {
      code: 'outputDebug(`Loaded session for ${store}: token=${maskToken(session.accessToken)}`)',
    },
    {
      name: 'a log template with a redacted token value is not a URL',
      code: 'log(`user=${name} token=${redact(t)}`)',
    },
    // The prefix requirement now matches the Literal branch: a bare `token=`
    // with no `?` or `&` before it is not a query parameter.
    { code: 'const msg = `status: token=${x}`' },
    // A longer parameter that merely ENDS in a sensitive name is not that
    // parameter: `?stateToken=` is OAuth state, not `?token=`.
    { code: 'const url = `${base}/sso/idps/${id}?stateToken=${stateHandle}`' },
    // An interpolation cannot form `?token=` by straddling the boundary —
    // each one is a placeholder, not empty string.
    { code: 'const url = `${prefix}?${key}token=${v}`' },
    {
      name: 'a pagination pageToken is not a credential',
      code: "fetch('/api/items?pageToken=abc&limit=10')",
    },
    {
      name: 'a parameter that merely starts with a credential word is not one',
      code: "const url = '/api/report?secret_name=db&password_policy=strict'",
    },
  ],

  invalid: [
    {
      name: 'an RFC 6750 access_token query parameter is a bearer credential',
      code: "fetch('/api/login?access_token=abc123&lang=en')",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'api_key after another parameter is the apikey credential',
      code: "const url = '/api/login?lang=en&api_key=abc123'",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a client_secret in a template query string is a credential',
      code: 'fetch(`/api/login?client_secret=${v}&lang=en`)',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'pwd and passwd are password parameters',
      code: "const url = '/login?user=bob&pwd=hunter2'",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a camelCase apiKey parameter is the apikey credential',
      code: "const url = '/maps?apiKey=abc123'",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A template that really does put a credential in a query string still
    // reports — okta/okta-signin-widget RouterUtil.js:34 is exactly this.
    {
      name: 'a token in the query string, where logs and Referer keep it',
      code: 'const u = `${baseUrl}/login/sessionCookieRedirect?check=true&token=${token}`',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a password query parameter interpolated into a template URL is reported',
      code: 'const u = `${base}?password=${pw}`',
      errors: [{ messageId: 'violationDetected' }],
    },
    // URLs with credentials in query params
    {
      code: "const url = 'https://api.example.com?password=secret123'",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "const url = 'https://api.example.com?token=abc123'",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "fetch('https://api.example.com?apikey=xyz789')",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "const url = 'https://api.com?user=john&password=xyz'",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Template literals with credentials
    {
      code: 'const url = `https://api.com?token=${token}`',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Out-of-band verification links
// ---------------------------------------------------------------------------
// benchmarks/corpus/CWE-640/safe/reset-link-config-origin.js builds
// `PUBLIC_ORIGIN + '/reset?token=' + encodeURIComponent(token)` and is labelled
// SAFE. A reset link has to carry its token in the query: the recipient is not
// authenticated yet, so no header or cookie is available, and the link must
// survive being pasted out of an email. Telling that code to "use the
// Authorization header" describes something it cannot do.
ruleTester.run(
  'no-credentials-in-query-params — verification links',
  noCredentialsInQueryParams,
  {
    valid: [
      `const resetUrl = PUBLIC_ORIGIN + '/reset?token=' + encodeURIComponent(token);`,
      `const url = base + '/verify-email?token=' + t;`,
      `const link = \`\${origin}/confirm?token=\${code}\`;`,
      `const u = '/activate?token=abc123';`,
      `const u = '/unsubscribe?token=abc123';`,
    ],
    invalid: [
      // Still reported: a token on an ordinary endpoint is not a reset link.
      {
        code: `const url = 'https://api.example.com/data?token=abc123';`,
        errors: [{ messageId: 'violationDetected' }],
      },
      // The exemption covers `token=` only — never a password or a key.
      {
        code: `const url = '/reset?password=hunter2';`,
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: `const url = '/reset?apikey=sk_live_abc';`,
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: `const url = '/reset?secret=shhh';`,
        errors: [{ messageId: 'violationDetected' }],
      },
      // A second credential alongside the reset token is not exempt.
      {
        code: `const url = '/reset?token=abc&apikey=sk_live';`,
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);

describe('a form-encoded body is not a query string', () => {
  /**
   * Provenance: hzi-braunschweig/pia-system
   * psa.lib.service-core/src/auth/tsoaAuthenticator.ts:77.
   *
   * RFC 6749 §2.3.1 prescribes exactly this shape for OAuth 2.0 token introspection
   * and the client-credentials grant. Reporting it tells code that is already using
   * a POST body to use a POST body.
   */
  ruleTester.run(
    'valid - credentials in a request body',
    noCredentialsInQueryParams,
    {
      valid: [
        'fetch(url, { method: "POST", body: `client_id=${id}&client_secret=${s}&token=${t}` });',
        'axios.post(url, { data: `grant_type=password&password=${pw}` });',
        'got(url, { form: `token=${t}&apikey=${k}` });',
        'const params = new URLSearchParams(`token=${t}&secret=${s}`);',
        'fetch(url, { body: "client_id=a&token=b" });',
      ],
      invalid: [],
    },
  );

  /** The same characters in a URL still report — only the position changed. */
  ruleTester.run(
    'invalid - the same string as a URL',
    noCredentialsInQueryParams,
    {
      valid: [],
      invalid: [
        {
          code: 'fetch(`https://api.example.com/v1/introspect?token=${t}`);',
          errors: 1,
        },
        {
          code: 'const endpoint = "https://api.example.com/v1/data?apikey=abc123";',
          errors: 1,
        },
      ],
    },
  );
});

describe('option: bodyProperties extends the payload vocabulary', () => {
  ruleTester.run('valid - a custom body property', noCredentialsInQueryParams, {
    valid: [
      {
        code: 'client.send({ payload: `client_id=${id}&token=${t}` });',
        options: [{ bodyProperties: ['payload'] }],
      },
      // A quoted key is the same key. `{ 'body': ... }` is what a serialiser or a
      // codegen emits, and it must be exempt on the same terms as `{ body: ... }`.
      "fetch(url, { 'body': `client_id=${id}&token=${t}` });",
      "fetch(url, { 'data': 'client_id=a&token=b' });",
    ],
    invalid: [],
  });

  /** Narrowing the vocabulary re-exposes what the default would have exempted. */
  ruleTester.run(
    'invalid - body dropped from the vocabulary',
    noCredentialsInQueryParams,
    {
      valid: [],
      invalid: [
        {
          code: 'fetch(url, { body: `client_id=${id}&token=${t}` });',
          options: [{ bodyProperties: ['form'] }],
          errors: 1,
        },
      ],
    },
  );
});

describe('option: credentialSuffixes replaces the credential vocabulary', () => {
  ruleTester.run(
    'credentialSuffixes decides which parameter names are credentials',
    noCredentialsInQueryParams,
    {
      valid: [
        {
          name: 'a suffix dropped from credentialSuffixes no longer reports: ?pwd= is a working directory here',
          code: "const url = 'https://files.example.com/list?pwd=/home'",
          options: [{ credentialSuffixes: ['password', 'secret'] }],
        },
        {
          name: 'a bare ?token= on an out-of-band reset flow stays exempt with an empty credentialSuffixes',
          code: "const url = 'https://app.example.com/reset?token=abc'",
          options: [{ credentialSuffixes: [] }],
        },
      ],
      invalid: [
        {
          name: 'the default credentialSuffixes reports ?pwd=',
          code: "const url = 'https://files.example.com/list?pwd=/home'",
          errors: 1,
        },
        {
          name: 'a suffix added to credentialSuffixes reports a parameter the default ignores',
          code: "const url = 'https://api.example.com/v1?license_key=abc'",
          options: [{ credentialSuffixes: ['license key'] }],
          errors: 1,
        },
        {
          name: 'an empty credentialSuffixes still reports a bare ?token=',
          code: "const url = 'https://api.example.com/v1?token=abc'",
          options: [{ credentialSuffixes: [] }],
          errors: 1,
        },
      ],
    },
  );
});
