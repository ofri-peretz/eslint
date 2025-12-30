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
  ],
  invalid: [
    {
      code: `document.cookie = 'token=abc123';`,
      errors: [{ messageId: 'authTokenInCookie' }],
    },
    {
      code: `document.cookie = 'authToken=xyz';`,
      errors: [{ messageId: 'authTokenInCookie' }],
    },
    {
      code: `document.cookie = 'jwt=eyJhbGciOiJIUzI1NiJ9';`,
      errors: [{ messageId: 'authTokenInCookie' }],
    },
    {
      code: `document.cookie = 'sessionId=12345';`,
      errors: [{ messageId: 'authTokenInCookie' }],
    },
    {
      code: `document.cookie = 'accessToken=' + token;`,
      errors: [{ messageId: 'authTokenInCookie' }],
    },
    {
      code: `document.cookie = \`auth=\${value}\`;`,
      errors: [{ messageId: 'authTokenInCookie' }],
    },
    {
      code: `document.cookie = 'token=abc123';`,
      filename: 'auth.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'authTokenInCookie' }],
    },
  ],
});
