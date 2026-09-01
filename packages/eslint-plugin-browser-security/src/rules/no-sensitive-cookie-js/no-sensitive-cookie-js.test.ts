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
    { name: 'a theme preference', code: `document.cookie = 'theme=dark';` },
    { code: `document.cookie = 'locale=en-US';` },
    { code: `const all = document.cookie;` },
    { code: `myObj.cookie = 'password=abc';` },
    { code: `document.cookie = 'password=abc';`, filename: 'auth.test.ts' },

    // --- the partition -------------------------------------------------------
    // Bearer credentials belong to no-cookie-auth-tokens.
    { code: `document.cookie = 'access_token=abc; Secure; SameSite=Strict';` },
    { code: `document.cookie = 'sessionId=xyz';` },
    { code: `document.cookie = 'jwt=abc';` },

    // --- whole-word on the cookie NAME --------------------------------------
    { code: `document.cookie = 'author=jane';` },
    { code: `document.cookie = 'creditLimit=5000';` },
    { code: `document.cookie = 'passwordLength=12';` },

    // Deletion is a clear-down, not a leak.
    { code: `document.cookie = 'api_key=; Max-Age=0';` },

    // Nothing statically known.
    { code: `document.cookie = name + '=' + value;` },
    { code: `document.cookie = 'Secure';` },
  ],
  invalid: [
    {
      name: 'an API key written to document.cookie',
      code: `document.cookie = 'api_key=sk-live-abc123';`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'api_key' } }],
    },
    {
      code: `document.cookie = 'password=secret123';`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'password' } }],
    },
    {
      code: `document.cookie = 'privateKey=' + pem;`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'privateKey' } }],
    },
    {
      code: `document.cookie = \`ssn=\${value}; Secure\`;`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'ssn' } }],
    },
    {
      code: `document.cookie = 'password=abc';`,
      filename: 'auth.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'sensitiveCookieJs' }],
    },
  ],
});

/**
 * Regression lock — left-nested concatenation.
 *
 * PRE-EXISTING DEFECT, now fixed. `extractCookieKey(value.left)` only saw a
 * literal when the concatenation had exactly two terms, so the most common real
 * spelling reported NOTHING — not a false positive, just silence.
 */
ruleTester.run('lock: left-nested concatenation', noSensitiveCookieJs, {
  valid: [],
  invalid: [
    {
      code: `document.cookie = 'api_key=' + key + '; Path=/';`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'api_key' } }],
    },
    {
      code: `document.cookie = 'user_password=' + pw + '; Secure' + '; SameSite=Lax';`,
      errors: [
        { messageId: 'sensitiveCookieJs', data: { key: 'user_password' } },
      ],
    },
  ],
});

/**
 * Regression lock — the sink may be spelled out or computed.
 */
ruleTester.run('lock: sink spellings', noSensitiveCookieJs, {
  valid: [
    { code: `top.document.cookie = 'password=abc';` },
    { code: `document[prop] = 'password=abc';` },
  ],
  invalid: [
    {
      code: `window.document.cookie = 'user_password=x; Secure';`,
      errors: [
        { messageId: 'sensitiveCookieJs', data: { key: 'user_password' } },
      ],
    },
    {
      code: `document['cookie'] = 'cvv=' + c;`,
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'cvv' } }],
    },
  ],
});

/**
 * `sensitivePatterns` REPLACES the default vocabulary; the bearer deferral is
 * structural and runs first, so configuring `'token'` cannot re-create the
 * double report with no-cookie-auth-tokens.
 */
ruleTester.run('option: sensitivePatterns', noSensitiveCookieJs, {
  valid: [
    {
      code: `document.cookie = 'password=abc';`,
      options: [{ sensitivePatterns: ['dossier'] }],
    },
    {
      code: `document.cookie = 'access_token=abc';`,
      options: [{ sensitivePatterns: ['token'] }],
    },
  ],
  invalid: [
    {
      code: `document.cookie = 'dossier=abc';`,
      options: [{ sensitivePatterns: ['dossier'] }],
      errors: [{ messageId: 'sensitiveCookieJs', data: { key: 'dossier' } }],
    },
  ],
});
