/**
 * Tests for no-insecure-cookie-options rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noInsecureCookieOptions } from './index';
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

ruleTester.run('no-insecure-cookie-options', noInsecureCookieOptions, {
  valid: [
    // Fully secure cookie
    {
      code: `
        res.cookie('session', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict'
        });
      `,
    },
    // Secure with lax sameSite
    {
      code: `
        res.cookie('session', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax'
        });
      `,
    },
    // Test file with allowInTests
    {
      code: `
        res.cookie('session', token);
      `,
      options: [{ allowInTests: true }],
      filename: 'app.test.ts',
    },
    // Not a cookie call
    {
      code: `
        obj.notCookie('session', token);
      `,
    },
  ],
  invalid: [
    // No options at all
    {
      code: `
        res.cookie('session', token);
      `,
      errors: [
        {
          messageId: 'insecureCookie',
          suggestions: [
            {
              messageId: 'addSecureFlags',
              output: `
        res.cookie('session', token, { httpOnly: true, secure: true, sameSite: "strict" });
      `,
            },
          ],
        },
      ],
    },
    // Missing httpOnly
    {
      code: `
        res.cookie('session', token, {
          secure: true,
          sameSite: 'strict'
        });
      `,
      errors: [
        {
          messageId: 'insecureCookie',
        },
      ],
    },
    // Missing secure
    {
      code: `
        res.cookie('session', token, {
          httpOnly: true,
          sameSite: 'strict'
        });
      `,
      errors: [
        {
          messageId: 'insecureCookie',
        },
      ],
    },
    // Missing sameSite
    {
      code: `
        res.cookie('session', token, {
          httpOnly: true,
          secure: true
        });
      `,
      errors: [
        {
          messageId: 'insecureCookie',
        },
      ],
    },
    // sameSite: 'none' not acceptable by default
    {
      code: `
        res.cookie('session', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        });
      `,
      errors: [
        {
          messageId: 'insecureCookie',
        },
      ],
    },
    // Empty options object
    {
      code: `
        res.cookie('session', token, {});
      `,
      errors: [
        {
          messageId: 'insecureCookie',
        },
      ],
    },
  ],
});
