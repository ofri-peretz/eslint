/**
 * Tests for no-cookie-auth-tokens rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noCookieAuthTokens } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-cookie-auth-tokens', noCookieAuthTokens, {
  valid: [
    { code: `document.cookie = 'theme=dark';` },
    { code: `document.cookie = 'locale=en-US';` },
    { code: `document.cookie = 'preference=compact';` },
    { code: `const cookie = document.cookie;` },
    { code: `document.cookie = 'token=abc';`, filename: 'auth.test.ts' },
    // Not document.cookie.
    { code: `myObj.cookie = 'token=abc123';` },
    { code: `cookies.set('token', 'abc123');` },

    // --- whole-word on the cookie NAME, not the whole string ----------------
    // PRE-EXISTING DEFECT, now fixed: the auth vocabulary was `.test()`ed
    // against the ENTIRE cookie string, so `/access/i` reported this.
    { code: `document.cookie = 'lastAccessed=2026-01-01';` },
    { code: `document.cookie = 'author=jane';` },
    // A value that happens to contain an auth word is not an auth cookie.
    { code: `document.cookie = 'redirect=/session/new';` },

    // --- the partition -------------------------------------------------------
    // Non-bearer secrets belong to no-sensitive-cookie-js.
    { code: `document.cookie = 'api_key=sk-live-abc123';` },
    { code: `document.cookie = 'password=secret123';` },

    // Deletion is the remediation, not the defect.
    { code: `document.cookie = 'sid=; Max-Age=0';` },
    { code: `document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT';` },

    // A cookie name we cannot read statically.
    { code: `document.cookie = name + '=' + value;` },
    { code: `document.cookie = buildCookie();` },
    // Both sides of the concatenation are opaque.
    { code: `document.cookie = a + b;` },
    { code: `document.cookie = 'Secure';` },
  ],
  invalid: [
    {
      code: `document.cookie = 'token=abc123';`,
      errors: [{ messageId: 'authTokenInCookie', data: { key: 'token' } }],
    },
    {
      code: `document.cookie = 'authToken=xyz';`,
      errors: [{ messageId: 'authTokenInCookie', data: { key: 'authToken' } }],
    },
    {
      code: `document.cookie = 'jwt=eyJhbGciOiJIUzI1NiJ9';`,
      errors: [{ messageId: 'authTokenInCookie', data: { key: 'jwt' } }],
    },
    {
      code: `document.cookie = 'sessionId=12345';`,
      errors: [{ messageId: 'authTokenInCookie', data: { key: 'sessionId' } }],
    },
    {
      code: `document.cookie = 'accessToken=' + token;`,
      errors: [{ messageId: 'authTokenInCookie', data: { key: 'accessToken' } }],
    },
    {
      code: `document.cookie = \`auth=\${value}\`;`,
      errors: [{ messageId: 'authTokenInCookie', data: { key: 'auth' } }],
    },
    {
      code: `document.cookie = 'token=abc123';`,
      filename: 'auth.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'authTokenInCookie' }],
    },
  ],
});

/**
 * Regression lock — left-nested concatenation.
 *
 * `'sid=' + id + '; Path=/'` parses as `(('sid=' + id) + '; Path=/')`, so
 * `value.left` is a BinaryExpression, not the literal. Both cookie rules read
 * only `value.left` and went silent on the commonest real spelling.
 */
ruleTester.run('lock: left-nested concatenation', noCookieAuthTokens, {
  valid: [],
  invalid: [
    {
      code: `document.cookie = 'sid=' + id + '; Path=/';`,
      errors: [{ messageId: 'authTokenInCookie', data: { key: 'sid' } }],
    },
    {
      code: `document.cookie = 'refresh_token=' + t + '; Secure' + '; SameSite=Strict';`,
      errors: [
        { messageId: 'authTokenInCookie', data: { key: 'refresh_token' } },
      ],
    },
    // Through a binding.
    {
      code: `
        const c = 'session=' + s + '; Path=/';
        document.cookie = c;
      `,
      errors: [{ messageId: 'authTokenInCookie', data: { key: 'session' } }],
    },
  ],
});

/**
 * Regression lock — `window.document.cookie` and `document['cookie']` are the
 * same sink. All three cookie rules compared `object.name === 'document'`
 * against a bare identifier only.
 */
ruleTester.run('lock: sink spellings', noCookieAuthTokens, {
  valid: [
    { code: `top.document.cookie = 'token=abc';` },
    { code: `document[prop] = 'token=abc';` },
  ],
  invalid: [
    {
      code: `window.document.cookie = 'session_id=' + s;`,
      errors: [{ messageId: 'authTokenInCookie', data: { key: 'session_id' } }],
    },
    {
      code: `document['cookie'] = 'jwt=' + t;`,
      errors: [{ messageId: 'authTokenInCookie', data: { key: 'jwt' } }],
    },
  ],
});

/**
 * The vocabulary is the caller's, with an explicit default.
 *
 * `namesBearerCredential` used to hold a hard-coded English word list one level
 * BELOW the rules that report from it, with no option surface anywhere: a user
 * whose cookie is called `handle` could not add it, and a user whose harmless
 * cookie collided with the list could not remove it. The default still
 * reproduces the old behaviour exactly.
 */
ruleTester.run('lock: bearerPatterns replaces the default vocabulary', noCookieAuthTokens, {
  valid: [
    // `token` is gone from the vocabulary the user supplied.
    {
      code: `document.cookie = 'access_token=' + t;`,
      options: [{ bearerPatterns: ['handle'] }],
    },
  ],
  invalid: [
    // …and a word the default list never had now reports.
    {
      code: `document.cookie = 'handle=' + h;`,
      options: [{ bearerPatterns: ['handle'] }],
      errors: [{ messageId: 'authTokenInCookie', data: { key: 'handle' } }],
    },
    // The default is unchanged.
    {
      code: `document.cookie = 'access_token=' + t;`,
      errors: [{ messageId: 'authTokenInCookie', data: { key: 'access_token' } }],
    },
  ],
});
