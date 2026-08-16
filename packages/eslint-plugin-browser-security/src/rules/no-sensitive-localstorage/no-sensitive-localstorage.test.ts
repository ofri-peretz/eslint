/**
 * Tests for no-sensitive-localstorage rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSensitiveLocalstorage } from './index';
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

ruleTester.run('no-sensitive-localstorage', noSensitiveLocalstorage, {
  valid: [
    // Non-sensitive data
    {
      code: `localStorage.setItem('theme', 'dark');`,
    },
    // User preferences
    {
      code: `localStorage.setItem('language', 'en');`,
    },
    // Non-sensitive bracket access
    {
      code: `localStorage['settings'] = JSON.stringify(settings);`,
    },
    // Test file with allowInTests
    {
      code: `localStorage.setItem('token', jwt);`,
      options: [{ allowInTests: true }],
      filename: 'auth.test.ts',
    },
    // sessionStorage with checkSessionStorage: false
    {
      code: `sessionStorage.setItem('token', jwt);`,
      options: [{ checkSessionStorage: false }],
    },

    // --- Judge the key that is WRITTEN, not the constant that holds it ------
    // All six corpus findings, from okta-signin-widget's sessionStorageHelper.
    // Every one reports on the old code, which matched the IDENTIFIER
    // `…_SESSION_STORAGE_KEY` — whose "session" and "key" are the name of the
    // storage API, not of anything secret. The strings they resolve to match
    // no sensitive pattern at all, and two of them hold a page URL and a
    // timestamp.
    {
      code: `
        const STATE_HANDLE_SESSION_STORAGE_KEY = 'osw-oie-state-handle';
        sessionStorage.setItem(STATE_HANDLE_SESSION_STORAGE_KEY, stateHandle);
      `,
    },
    {
      code: `
        const LAST_INITIATED_LOGIN_URL_SESSION_STORAGE_KEY = 'osw-oie-last-initiated-login-url';
        sessionStorage.setItem(LAST_INITIATED_LOGIN_URL_SESSION_STORAGE_KEY, window.location.href);
      `,
    },
    {
      code: `
        const RESEND_TIMESTAMP_SESSION_STORAGE_KEY = 'osw-oie-resend-timestamp';
        sessionStorage.setItem(RESEND_TIMESTAMP_SESSION_STORAGE_KEY, timestampStr);
      `,
    },
    // Same resolution through the bracket-assignment path.
    {
      code: `
        const PREFS_LOCAL_STORAGE_KEY = 'ui-prefs';
        localStorage[PREFS_LOCAL_STORAGE_KEY] = JSON.stringify(prefs);
      `,
    },
    // A key expression we cannot resolve to a string at all says nothing.
    { code: `localStorage.setItem(makeKey(id), value);` },
    { code: `localStorage[computeKey()] = value;` },
  ],
  invalid: [
    // Token in localStorage
    {
      code: `localStorage.setItem('token', jwt);`,
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
        },
      ],
    },
    // accessToken
    {
      code: `localStorage.setItem('accessToken', token);`,
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
        },
      ],
    },
    // Password
    {
      code: `localStorage.setItem('password', pwd);`,
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
        },
      ],
    },
    // API key
    {
      code: `localStorage.setItem('api_key', key);`,
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
        },
      ],
    },
    // Bracket assignment
    {
      code: `localStorage['authToken'] = token;`,
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
        },
      ],
    },
    // sessionStorage
    {
      code: `sessionStorage.setItem('jwt', token);`,
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
        },
      ],
    },
    // refresh_token
    {
      code: `localStorage.setItem('refresh_token', refreshToken);`,
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
        },
      ],
    },
    // Variable key that looks sensitive (identifier detection)
    {
      code: `localStorage.setItem(password, value);`,
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
        },
      ],
    },
    // Identifier property access with sensitive name
    {
      code: `localStorage.secret = secretValue;`,
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
        },
      ],
    },
    // Bracket with string literal
    {
      code: `localStorage['apiKey'] = keyValue;`,
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
        },
      ],
    },
    // allowInTests: false in test file
    {
      code: `localStorage.setItem('token', jwt);`,
      filename: 'auth.test.ts',
      options: [{ allowInTests: false }],
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
        },
      ],
    },

    // --- FN locks for the resolution change --------------------------------
    // Resolution CATCHES a sensitive key an unremarkable constant name hides —
    // the old code judged `K` and saw nothing.
    {
      code: `
        const K = 'refresh_token';
        localStorage.setItem(K, value);
      `,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    {
      code: `
        const K = 'apiKey';
        localStorage[K] = value;
      `,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    // A binding that cannot be resolved falls back to the spelling, which is
    // the only evidence left. `let` reassignment makes it unknowable.
    {
      code: `
        function save(accessToken, value) { localStorage.setItem(accessToken, value); }
      `,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    // Non-computed member access IS the key name, not a variable to resolve.
    {
      code: `localStorage.authToken = value;`,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
  ],
});

/**
 * Regression lock — `window.localStorage` is `localStorage`.
 */
ruleTester.run('lock: the global may be spelled out', noSensitiveLocalstorage, {
  valid: [
    { code: 'myLocalStorageWrapper.setItem("password", pw);' },
    { code: 'top.localStorage.setItem("password", pw);' },
    { code: 'window[storageName].setItem("password", pw);' },
  ],
  invalid: [
    {
      code: 'window.localStorage.setItem("password", pw);',
      errors: [{ messageId: 'sensitiveLocalStorage', data: { key: 'password', storage: 'localStorage' } }],
    },
    {
      code: 'globalThis.localStorage.setItem("apiKey", k);',
      errors: [{ messageId: 'sensitiveLocalStorage', data: { key: 'apiKey', storage: 'localStorage' } }],
    },
    {
      code: 'self.sessionStorage.setItem("secret", s);',
      errors: [{ messageId: 'sensitiveLocalStorage', data: { key: 'secret', storage: 'sessionStorage' } }],
    },
    {
      code: 'window.localStorage.authToken = t;',
      errors: [{ messageId: 'sensitiveLocalStorage', data: { key: 'authToken', storage: 'localStorage' } }],
    },
  ],
});

/**
 * `sensitivePatterns` REPLACES the default vocabulary. The same code must give
 * a different verdict with and without it, or the option proves nothing.
 */
ruleTester.run('option: sensitivePatterns replaces the vocabulary', noSensitiveLocalstorage, {
  valid: [
    // `password` is in the DEFAULT list but not in this one.
    {
      code: 'localStorage.setItem("password", pw);',
      options: [{ sensitivePatterns: ['dossier'] }],
    },
    // And a project word is not sensitive by default.
    { code: 'localStorage.setItem("dossier", d);' },
  ],
  invalid: [
    // Same two snippets, verdicts swapped.
    {
      code: 'localStorage.setItem("password", pw);',
      errors: [{ messageId: 'sensitiveLocalStorage', data: { key: 'password', storage: 'localStorage' } }],
    },
    {
      code: 'localStorage.setItem("dossier", d);',
      options: [{ sensitivePatterns: ['dossier'] }],
      errors: [{ messageId: 'sensitiveLocalStorage', data: { key: 'dossier', storage: 'localStorage' } }],
    },
  ],
});
