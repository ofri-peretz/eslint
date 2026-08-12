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
    { code: "const url = 'https://api.example.com/data'" },
    { code: "const url = 'https://api.example.com?user=john'" },
    { code: "fetch('https://api.example.com/users')" },
    { code: "const x = 1" },

    // --- A template is not a URL just because it contains "token=" ----------
    // Shopify/cli session-lifecycle.ts:56. A DEBUG LOG whose value is
    // explicitly masked. The old branch read `sourceCode.getText(node)` — the
    // template's own SOURCE, interpolations included — and required no `?`/`&`
    // prefix, so `: token=${maskToken(t)}` matched. Wrong twice: not a URL,
    // and the value is redacted.
    { code: "outputDebug(`Loaded session for ${store}: token=${maskToken(session.accessToken)}`)" },
    { code: "log(`user=${name} token=${redact(t)}`)" },
    // The prefix requirement now matches the Literal branch: a bare `token=`
    // with no `?` or `&` before it is not a query parameter.
    { code: "const msg = `status: token=${x}`" },
    // A longer parameter that merely ENDS in a sensitive name is not that
    // parameter: `?stateToken=` is OAuth state, not `?token=`.
    { code: "const url = `${base}/sso/idps/${id}?stateToken=${stateHandle}`" },
    // An interpolation cannot form `?token=` by straddling the boundary —
    // each one is a placeholder, not empty string.
    { code: "const url = `${prefix}?${key}token=${v}`" },
  ],

  invalid: [
    // A template that really does put a credential in a query string still
    // reports — okta/okta-signin-widget RouterUtil.js:34 is exactly this.
    {
      code: "const u = `${baseUrl}/login/sessionCookieRedirect?check=true&token=${token}`",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "const u = `${base}?password=${pw}`",
      errors: [{ messageId: 'violationDetected' }],
    },
    // URLs with credentials in query params
    { code: "const url = 'https://api.example.com?password=secret123'", errors: [{ messageId: 'violationDetected' }] },
    { code: "const url = 'https://api.example.com?token=abc123'", errors: [{ messageId: 'violationDetected' }] },
    { code: "fetch('https://api.example.com?apikey=xyz789')", errors: [{ messageId: 'violationDetected' }] },
    { code: "const url = 'https://api.com?user=john&password=xyz'", errors: [{ messageId: 'violationDetected' }] },
    // Template literals with credentials
    { code: "const url = `https://api.com?token=${token}`", errors: [{ messageId: 'violationDetected' }] },
  ],
});
