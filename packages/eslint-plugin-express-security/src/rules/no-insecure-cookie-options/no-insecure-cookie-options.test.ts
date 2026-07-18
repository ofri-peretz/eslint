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

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
import { describe, expect, it } from 'vitest';
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import { checkCookieOptions } from './index';

ruleTester.run('no-insecure-cookie-options (coverage wave)', noInsecureCookieOptions, {
  valid: [
    // requireHttpOnly: false — httpOnly check skipped
    {
      code: `res.cookie('a', 'b', { secure: true, sameSite: 'strict' });`,
      options: [{ requireHttpOnly: false }],
    },
    // requireSecure: false — secure check skipped
    {
      code: `res.cookie('a', 'b', { httpOnly: true, sameSite: 'strict' });`,
      options: [{ requireSecure: false }],
    },
    // requireSameSite: false — sameSite check skipped
    {
      code: `res.cookie('a', 'b', { httpOnly: true, secure: true });`,
      options: [{ requireSameSite: false }],
    },
    // options argument is not an object literal
    { code: `res.cookie('a', 'b', cookieOptions);` },
  ],
  invalid: [
    // custom acceptableSameSiteValues rejects 'lax'
    {
      code: `res.cookie('a', 'b', { httpOnly: true, secure: true, sameSite: 'lax' });`,
      options: [{ acceptableSameSiteValues: ['strict'] }],
      errors: [{ messageId: 'insecureCookie' }],
    },
  ],
});

// Layer 2: unit tests for the exported checkCookieOptions helper. The rule
// pipeline always passes fully-merged options, so the acceptableSameSiteValues
// fallback is only reachable by calling the helper directly.
describe('checkCookieOptions (unit)', () => {
  const fakeSourceCode = (text: string) =>
    ({ getText: () => text }) as unknown as TSESLint.SourceCode;
  const node = {} as TSESTree.ObjectExpression;

  it('falls back to default acceptable sameSite values when the option is absent', () => {
    const result = checkCookieOptions(
      node,
      fakeSourceCode("{ httpOnly: true, secure: true, sameSite: 'lax' }"),
      {},
    );
    expect(result.issues).toEqual([]);
    expect(result.hasSuggestions).toBe(false);
  });

  it('flags an unacceptable sameSite value against the default list', () => {
    const result = checkCookieOptions(
      node,
      fakeSourceCode("{ httpOnly: true, secure: true, sameSite: 'none' }"),
      {},
    );
    expect(result.issues).toEqual(["sameSite should be 'strict' or 'lax', not 'none'"]);
    expect(result.hasSuggestions).toBe(true);
  });
});
