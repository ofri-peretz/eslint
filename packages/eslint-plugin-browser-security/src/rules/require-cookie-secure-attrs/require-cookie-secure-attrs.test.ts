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
    { name: 'both attributes set', code: `document.cookie = 'theme=dark; Secure; SameSite=Strict';` },
    { code: `document.cookie = 'sid=abc; Path=/; Secure; SameSite=Lax';` },
    { code: `const c = document.cookie;` },
    { code: `myObj.cookie = 'theme=dark';` },
    { code: `document.cookie = 'theme=dark';`, filename: 'x.test.ts' },
    // Nothing statically known — abstain rather than guess.
    { code: `document.cookie = buildCookie();` },
    { code: `document.cookie = name + '=' + value;` },
    // A private class field is a MemberExpression whose property can never be
    // an identifier naming a global API.
    { code: `class A { #cookie; f() { this.#cookie = 'a=b'; } }` },
    // Not a name=value set.
    { code: `document.cookie = 'Secure';` },

    // PRE-EXISTING DEFECT, now fixed: deleting a cookie was reported for
    // missing attributes on a value that no longer exists.
    { code: `document.cookie = 'sid=; Max-Age=0';` },
    {
      code: `document.cookie = 'sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT';`,
    },
  ],
  invalid: [
    {
      name: 'a cookie with neither Secure nor SameSite',
      code: `document.cookie = 'theme=dark';`,
      errors: [
        { messageId: 'missingSecure' },
        { messageId: 'missingSameSite' },
      ],
    },
    {
      code: `document.cookie = 'sid=abc; SameSite=Strict';`,
      errors: [{ messageId: 'missingSecure' }],
    },
    {
      code: `document.cookie = 'sid=abc; Secure';`,
      errors: [{ messageId: 'missingSameSite' }],
    },
    {
      code: `document.cookie = \`sid=\${id}; Path=/\`;`,
      errors: [
        { messageId: 'missingSecure' },
        { messageId: 'missingSameSite' },
      ],
    },
    {
      code: `document.cookie = 'theme=dark';`,
      filename: 'x.test.ts',
      options: [{ allowInTests: false }],
      errors: [
        { messageId: 'missingSecure' },
        { messageId: 'missingSameSite' },
      ],
    },
  ],
});

/**
 * Regression lock — concatenation.
 *
 * PRE-EXISTING DEFECT, now fixed. Only `Literal` and `TemplateLiteral` were
 * understood, so `'sid=' + id + '; Secure; SameSite=Strict'` — the commonest
 * spelling in real code — was never checked at all, in EITHER direction: a
 * hardened cookie and an unhardened one both reported nothing.
 */
ruleTester.run('lock: concatenated cookie strings', requireCookieSecureAttrs, {
  valid: [
    // Positive control for the pair below: with the attributes present, silence.
    { code: `document.cookie = 'sid=' + id + '; Secure; SameSite=Strict';` },
    {
      code: `
        const c = 'sid=' + id + '; Secure; SameSite=Lax';
        document.cookie = c;
      `,
    },
  ],
  invalid: [
    {
      code: `document.cookie = 'sid=' + id + '; Path=/';`,
      errors: [
        { messageId: 'missingSecure' },
        { messageId: 'missingSameSite' },
      ],
    },
    {
      code: `document.cookie = 'sid=' + id + '; Secure';`,
      errors: [{ messageId: 'missingSameSite' }],
    },
    // The attribute half is interpolated, so nothing about it is known.
    {
      code: `document.cookie = 'sid=abc; ' + attrs;`,
      errors: [
        { messageId: 'missingSecure' },
        { messageId: 'missingSameSite' },
      ],
    },
  ],
});

/**
 * Regression lock — `window.document.cookie` is the same sink.
 */
ruleTester.run('lock: sink spellings', requireCookieSecureAttrs, {
  valid: [{ code: `top.document.cookie = 'theme=dark';` }],
  invalid: [
    {
      code: `window.document.cookie = 'theme=dark';`,
      errors: [
        { messageId: 'missingSecure' },
        { messageId: 'missingSameSite' },
      ],
    },
    {
      code: `document['cookie'] = 'theme=dark';`,
      errors: [
        { messageId: 'missingSecure' },
        { messageId: 'missingSameSite' },
      ],
    },
  ],
});

/**
 * Regression lock — `Secure` is an attribute, not a substring.
 *
 * `/;\s*secure/i` matched `; secureFlag=1`, which is not the Secure attribute,
 * and `/;\s*samesite/i` matched `; samesiteHint` with no `=`.
 */
ruleTester.run('lock: attribute matching is anchored', requireCookieSecureAttrs, {
  valid: [{ code: `document.cookie = 'a=b; Secure; SameSite=None';` }],
  invalid: [
    {
      code: `document.cookie = 'a=b; secureFlag=1; SameSite=Lax';`,
      errors: [{ messageId: 'missingSecure' }],
    },
    {
      code: `document.cookie = 'a=b; Secure; samesiteHint';`,
      errors: [{ messageId: 'missingSameSite' }],
    },
  ],
});
