/**
 * Tests for no-sensitive-cookie-js rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSensitiveCookieJs } from './index';
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

ruleTester.run('no-sensitive-cookie-js', noSensitiveCookieJs, {
  valid: [
    // Non-sensitive cookies are allowed
    {
      code: `document.cookie = "theme=dark";`,
    },
    {
      code: `document.cookie = "locale=en-US";`,
    },
    {
      code: `document.cookie = "preference=compact";`,
    },
    // Cookie with security attributes but non-sensitive
    {
      code: `document.cookie = "visited=true; Secure; SameSite=Strict";`,
    },
    // Not document.cookie
    {
      code: `myObj.cookie = "token=abc123";`,
    },
    {
      code: `cookies.set("token", "abc123");`,
    },
    // Reading cookies is fine
    {
      code: `const allCookies = document.cookie;`,
    },
    // Test files allowed by default
    {
      code: `document.cookie = "token=abc123";`,
      filename: 'auth.test.ts',
    },
    {
      code: `document.cookie = "sessionId=xyz";`,
      filename: 'session.spec.js',
    },
    // Template literal with non-sensitive key
    {
      code: 'document.cookie = `theme=${theme}`;',
    },
    // Binary expression with non-sensitive key
    {
      code: `document.cookie = "lang=" + language;`,
    },
  ],
  invalid: [
    // Sensitive: token
    {
      code: `document.cookie = "token=abc123";`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'token' } }],
    },
    {
      code: `document.cookie = "authToken=xyz789";`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'authToken' } }],
    },
    // Sensitive: session
    {
      code: `document.cookie = "sessionId=sess_abc123";`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'sessionId' } }],
    },
    {
      code: `document.cookie = "session_id=12345";`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'session_id' } }],
    },
    // Sensitive: jwt
    {
      code: `document.cookie = "jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'jwt' } }],
    },
    // Sensitive: access_token
    {
      code: `document.cookie = "access_token=token123";`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'access_token' } }],
    },
    // Sensitive: refresh_token
    {
      code: `document.cookie = "refresh_token=refresh123";`,
      errors: [
        { messageId: 'sensitiveCookieJs', data: { key: 'refresh_token' } },
      ],
    },
    // Sensitive: api_key
    {
      code: `document.cookie = "api_key=sk-live-abc123";`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'api_key' } }],
    },
    // Sensitive: password
    {
      code: `document.cookie = "password=secret123";`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'password' } }],
    },
    // Template literal with sensitive key
    {
      code: 'document.cookie = `token=${token}; Secure`;',
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'token' } }],
    },
    // Binary expression with sensitive key
    {
      code: `document.cookie = "sessionId=" + sessionValue;`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'sessionId' } }],
    },
    // With security attributes (still flagged - should be HttpOnly)
    {
      code: `document.cookie = "token=abc; Secure; SameSite=Strict";`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'token' } }],
    },
    // Test file with allowInTests: false
    {
      code: `document.cookie = "token=abc123";`,
      filename: 'auth.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'token' } }],
    },
    // Custom sensitive pattern
    {
      code: `document.cookie = "customSecret=value";`,
      options: [{ sensitivePatterns: ['customSecret'] }],
      errors: [
        { messageId: 'sensitiveCookieJs', data: { key: 'customSecret' } },
      ],
    },
    // Credential
    {
      code: `document.cookie = "credential=cred123";`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'credential' } }],
    },
    // Bearer
    {
      code: `document.cookie = "bearer=abc123";`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'bearer' } }],
    },
  ],
});
