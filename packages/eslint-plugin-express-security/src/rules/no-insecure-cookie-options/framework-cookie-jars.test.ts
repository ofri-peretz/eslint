/**
 * no-insecure-cookie-options: framework cookie jars (`cookies.set(name, value, opts)`).
 *
 * Measured by reading framework docs (results tracked privately): no cookie rule
 * fired on `cookies.set("sb-refresh-token", token, { path: "/" })`, the pattern
 * Astro's own auth guides copy. Astro's jar passes the options straight to the
 * serializer and adds no defaults, so the attributes written are the attributes
 * that exist. Express's `res.cookie` was the only jar the rule read.
 *
 * Which jars count is decided by what the file IMPORTS, not by the receiver's
 * name: SvelteKit's `cookies.set` defaults to httpOnly and secure, Koa's to
 * httpOnly, and `js-cookie` runs in the browser where httpOnly cannot be set at
 * all, so a bare `cookies.set` says nothing. Astro, Qwik City and `next/headers`
 * are jars with no hardened defaults.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noInsecureCookieOptions } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const ASTRO = "import type { APIRoute } from 'astro';\n";
const QWIK = "import type { RequestHandler } from '@builder.io/qwik-city';\n";
const NEXT = "import { cookies } from 'next/headers';\n";

ruleTester.run(
  'no-insecure-cookie-options (framework cookie jars)',
  noInsecureCookieOptions,
  {
    valid: [
      {
        name: 'every attribute that matters is set',
        code: `${ASTRO}cookies.set('sb-access-token', t, { httpOnly: true, secure: true, sameSite: 'lax', path: '/' });`,
      },
      {
        name: 'a cookie that is not a credential',
        code: `${ASTRO}cookies.set('theme', 'dark');`,
      },
      {
        name: 'a locale cookie with options that omit the flags',
        code: `${ASTRO}cookies.set('locale', 'en', { path: '/' });`,
      },
      {
        name: 'a name the file computes cannot be judged',
        code: `${ASTRO}cookies.set(name, value, { path: '/' });`,
      },
      {
        name: 'a spread may carry the flags',
        code: `${ASTRO}cookies.set('auth', t, { ...base, path: '/' });`,
      },
      {
        name: 'a flag taken from configuration is not an insecure literal',
        code: `${ASTRO}cookies.set('auth', t, { httpOnly: true, secure: import.meta.env.PROD });`,
      },
      {
        name: 'deleting a cookie writes no value',
        code: `${ASTRO}cookies.delete('sb-access-token', { path: '/' });`,
      },
      {
        name: 'a jar whose framework hardens the defaults (SvelteKit)',
        code: `import { redirect } from '@sveltejs/kit';
        cookies.set('session', id, { path: '/' });`,
      },
      {
        name: 'a browser-side library cannot set httpOnly at all',
        code: `import Cookies from 'js-cookie';
        Cookies.set('token', t, { expires: 7 });`,
      },
      {
        name: 'a file that imports no framework jar',
        code: `cookies.set('auth', token);`,
      },
      {
        name: 'a plain Map called cookies',
        code: `${ASTRO}const m = new Map(); m.set('auth', 1);`,
      },
      {
        name: 'an unrelated receiver in an Astro file',
        code: `${ASTRO}registry.set('auth', handler);`,
      },
      {
        name: 'options held in a variable cannot be judged',
        code: `${ASTRO}cookies.set('auth', v, options);`,
      },
      {
        name: 'a receiver that is not a jar shape',
        code: `${ASTRO}(a || b).set('auth', v);`,
      },
      {
        name: 'Qwik: all flags set',
        code: `${QWIK}cookie.set('auth', t, { httpOnly: true, secure: true, path: '/' });`,
      },
      {
        name: 'Next: all flags set',
        code: `${NEXT}cookies().set('session', id, { httpOnly: true, secure: true });`,
      },
    ],
    invalid: [
      {
        name: 'Astro: a refresh token with only a path',
        code: `${ASTRO}cookies.set('sb-refresh-token', refresh, { path: '/' });`,
        errors: [{ messageId: 'insecureCookie' }],
      },
      {
        name: 'Astro: no options at all',
        code: `${ASTRO}cookies.set('__session', value);`,
        errors: [
          {
            messageId: 'insecureCookie',
            suggestions: [
              {
                messageId: 'addSecureFlags',
                output: `${ASTRO}cookies.set('__session', value, { httpOnly: true, secure: true, sameSite: "strict" });`,
              },
            ],
          },
        ],
      },
      {
        name: 'Astro: through context.cookies, secure missing',
        code: `${ASTRO}context.cookies.set('__session', v, { httpOnly: true, path: '/' });`,
        errors: [{ messageId: 'insecureCookie' }],
      },
      {
        name: 'Astro: through Astro.cookies, httpOnly missing',
        code: `${ASTRO}Astro.cookies.set('auth', v, { secure: true });`,
        errors: [{ messageId: 'insecureCookie' }],
      },
      {
        name: 'Astro: httpOnly written as a literal false',
        code: `${ASTRO}cookies.set('auth', v, { httpOnly: false, secure: true });`,
        errors: [{ messageId: 'insecureCookie' }],
      },
      {
        name: 'Astro: the module specifier with a namespace, astro:middleware',
        code: `import { defineMiddleware } from 'astro:middleware';
        cookies.set('session', v, { path: '/' });`,
        errors: [{ messageId: 'insecureCookie' }],
      },
      {
        name: 'Qwik City: the singular cookie jar',
        code: `${QWIK}cookie.set('auth', getAuthToken(data));`,
        errors: [
          {
            messageId: 'insecureCookie',
            suggestions: [
              {
                messageId: 'addSecureFlags',
                output: `${QWIK}cookie.set('auth', getAuthToken(data), { httpOnly: true, secure: true, sameSite: "strict" });`,
              },
            ],
          },
        ],
      },
      {
        name: 'Next: the cookies() accessor',
        code: `${NEXT}cookies().set('token', t, { path: '/' });`,
        errors: [{ messageId: 'insecureCookie' }],
      },
      {
        name: 'Next: awaited cookies()',
        code: `${NEXT}(await cookies()).set('session', id);`,
        errors: [
          {
            messageId: 'insecureCookie',
            suggestions: [
              {
                messageId: 'addSecureFlags',
                output: `${NEXT}(await cookies()).set('session', id, { httpOnly: true, secure: true, sameSite: "strict" });`,
              },
            ],
          },
        ],
      },
    ],
  },
);
