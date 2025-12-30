/**
 * Tests for require-cookie-secure-attrs rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireCookieSecureAttrs } from './index';
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

ruleTester.run('require-cookie-secure-attrs', requireCookieSecureAttrs, {
  valid: [
    // Has both attributes
    {
      code: `document.cookie = 'name=value; Secure; SameSite=Strict';`,
    },
    {
      code: `document.cookie = 'session=abc; secure; samesite=lax';`,
    },
    // Reading cookie is fine
    {
      code: `const cookie = document.cookie;`,
    },
    // Test files allowed
    {
      code: `document.cookie = 'name=value';`,
      filename: 'cookie.test.ts',
    },
    // Dynamic cookie (can't analyze)
    {
      code: `document.cookie = cookieString;`,
    },
  ],
  invalid: [
    // Missing both
    {
      code: `document.cookie = 'name=value';`,
      errors: [
        { messageId: 'missingSecure' },
        { messageId: 'missingSameSite' },
      ],
    },
    // Missing Secure only
    {
      code: `document.cookie = 'name=value; SameSite=Strict';`,
      errors: [{ messageId: 'missingSecure' }],
    },
    // Missing SameSite only
    {
      code: `document.cookie = 'name=value; Secure';`,
      errors: [{ messageId: 'missingSameSite' }],
    },
    // Template literal missing attributes
    {
      code: `document.cookie = \`name=\${value}\`;`,
      errors: [
        { messageId: 'missingSecure' },
        { messageId: 'missingSameSite' },
      ],
    },
    // Test file with allowInTests: false
    {
      code: `document.cookie = 'name=value';`,
      filename: 'cookie.test.ts',
      options: [{ allowInTests: false }],
      errors: [
        { messageId: 'missingSecure' },
        { messageId: 'missingSameSite' },
      ],
    },
  ],
});
