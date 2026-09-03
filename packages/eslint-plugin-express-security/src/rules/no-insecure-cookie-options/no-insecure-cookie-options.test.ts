/**
 * Tests for no-insecure-cookie-options rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noInsecureCookieOptions } from './index';
import * as vitest from 'vitest';
/**
 * Every fixture imports express, because the rules now abstain in files with no
 * Express in them. Wrapping the arrays rather than editing each fixture means
 * one cannot be left behind — a fixture missing the import would pass vacuously
 * on the gate instead of exercising the detection it was written for. `output`
 * and errors[].suggestions[].output are prefixed too, since autofix fixtures
 * assert the whole file back.
 */
// A SIDE-EFFECT import: it satisfies the gate without reserving the `express`
// binding. Several fixtures already declare `const express = require('express')`
// at module level, and a default import would redeclare it.
const asExpress = (code: string): string => `import 'express';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const xp = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asExpress(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asExpress(test.code),
      ...(typeof test.output === 'string' ? { output: asExpress(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asExpress(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


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
  valid: xp([
    // Fully secure cookie
    {
      name: 'all three set',
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

    // --- ES6 shorthand properties ------------------------------------------
    // Corpus: auth0/express-openid-connect
    // middleware/attemptSilentLogin.js:15 — every flag IS set, from the app's
    // own session config. The old predicate regexed `sourceCode.getText()`,
    // and printed source contains no `secure: true` to match when the property
    // is written `secure`.
    {
      code: `
        const {
          config: { session: { cookie: { secure, domain, path, sameSite } } },
        } = weakRef(req.oidc);
        res.cookie(COOKIE_NAME, true, {
          httpOnly: true,
          secure,
          domain,
          path,
          sameSite,
        });
      `,
    },
    // The same claim through a variable rather than shorthand.
    {
      code: `res.cookie('a', 'b', { httpOnly: true, secure: isProduction, sameSite: cookieSameSite });`,
    },
    // A spread can carry any of the three; nothing here can see inside it.
    {
      code: `res.cookie('a', 'b', { ...defaults });`,
    },
    // Quoted keys read the same as identifier keys.
    {
      code: `res.cookie('a', 'b', { 'httpOnly': true, 'secure': true, 'sameSite': 'strict' });`,
    },
    // Case-insensitive, as the regex it replaces was.
    {
      code: `res.cookie('a', 'b', { HTTPONLY: true, SECURE: true, SAMESITE: 'Strict' });`,
    },
  ]),
  invalid: xp([
    // No options at all
    {
      name: 'a session cookie with no httpOnly, secure or sameSite',
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

    // --- The shorthand narrowing must not become an FN ---------------------
    // An explicitly disabled flag is still insecure. The old regex reported
    // these too, and must keep doing so.
    {
      code: `res.cookie('a', 'b', { httpOnly: false, secure: true, sameSite: 'strict' });`,
      errors: [{ messageId: 'insecureCookie' }],
    },
    {
      code: `res.cookie('a', 'b', { httpOnly: true, secure: false, sameSite: 'strict' });`,
      errors: [{ messageId: 'insecureCookie' }],
    },
    // A later write wins, exactly as the object evaluates.
    {
      code: `res.cookie('a', 'b', { secure: true, httpOnly: true, secure: false, sameSite: 'strict' });`,
      errors: [{ messageId: 'insecureCookie' }],
    },
    // A computed key names nothing we can read, so the flag is still absent.
    {
      code: `res.cookie('a', 'b', { [flagName]: true, httpOnly: true, sameSite: 'strict' });`,
      errors: [{ messageId: 'insecureCookie' }],
    },
    // Nested objects do not satisfy the top-level flags — the regex searched
    // the whole printed object and would have accepted this.
    {
      code: `res.cookie('a', 'b', { opts: { httpOnly: true, secure: true, sameSite: 'strict' } });`,
      errors: [{ messageId: 'insecureCookie' }],
    },
    // sameSite written as a non-acceptable literal, alongside a spread that
    // covers the boolean flags.
    {
      code: `res.cookie('a', 'b', { ...defaults, sameSite: 'none' });`,
      errors: [{ messageId: 'insecureCookie' }],
    },
  ]),
});

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
import { describe, expect, it } from 'vitest';
import type { TSESTree } from '@interlace/eslint-devkit';
import { parse } from '@typescript-eslint/parser';
import { checkCookieOptions } from './index';



ruleTester.run(
  'no-insecure-cookie-options (coverage wave)',
  noInsecureCookieOptions,
  {
    valid: xp([
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
    ]),
    invalid: xp([
      // custom acceptableSameSiteValues rejects 'lax'
      {
        code: `res.cookie('a', 'b', { httpOnly: true, secure: true, sameSite: 'lax' });`,
        options: [{ acceptableSameSiteValues: ['strict'] }],
        errors: [{ messageId: 'insecureCookie' }],
      },
    ]),
  },
);

// Layer 2: unit tests for the exported checkCookieOptions helper. The rule
// pipeline always passes fully-merged options, so the acceptableSameSiteValues
// fallback is only reachable by calling the helper directly.
//
// The helper now reads the ObjectExpression rather than its printed text, so
// these fixtures are parsed rather than string-stubbed.
describe('checkCookieOptions (unit)', () => {
  const optionsObject = (source: string): TSESTree.ObjectExpression => {
    const program = parse(`x(${source})`, { range: true, loc: true });
    const statement = program.body[0] as TSESTree.ExpressionStatement;
    const call = statement.expression as TSESTree.CallExpression;
    return call.arguments[0] as TSESTree.ObjectExpression;
  };

  it('falls back to default acceptable sameSite values when the option is absent', () => {
    const result = checkCookieOptions(
      optionsObject("{ httpOnly: true, secure: true, sameSite: 'lax' }"),
      {},
    );
    expect(result.issues).toEqual([]);
    expect(result.hasSuggestions).toBe(false);
  });

  it('flags an unacceptable sameSite value against the default list', () => {
    const result = checkCookieOptions(
      optionsObject("{ httpOnly: true, secure: true, sameSite: 'none' }"),
      {},
    );
    expect(result.issues).toEqual([
      "sameSite should be 'strict' or 'lax', not 'none'",
    ]);
    expect(result.hasSuggestions).toBe(true);
  });

  // Corpus shape: auth0/express-openid-connect
  // middleware/attemptSilentLogin.js:15. Every flag is set; only the printed
  // source lacks the `: true` the old regex was looking for.
  it('treats shorthand properties as set', () => {
    const result = checkCookieOptions(
      optionsObject('{ httpOnly: true, secure, domain, path, sameSite }'),
      {},
    );
    expect(result.issues).toEqual([]);
  });

  it('still reports flags written to a non-true literal', () => {
    const result = checkCookieOptions(
      optionsObject("{ httpOnly: false, secure: 0, sameSite: 'strict' }"),
      {},
    );
    expect(result.issues).toEqual([
      'missing httpOnly flag (prevents XSS access to cookie)',
      'missing secure flag (cookie sent over HTTPS only)',
    ]);
  });

  it('cannot see through a spread, so claims nothing about it', () => {
    const result = checkCookieOptions(optionsObject('{ ...base }'), {});
    expect(result.issues).toEqual([]);
  });
});
