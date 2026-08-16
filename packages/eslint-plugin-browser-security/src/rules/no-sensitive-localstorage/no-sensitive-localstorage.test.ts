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
    { code: `localStorage.setItem('theme', 'dark');` },
    { code: `localStorage.setItem('language', 'en');` },
    { code: `localStorage['settings'] = JSON.stringify(settings);` },
    // Test file with allowInTests
    {
      code: `localStorage.setItem('password', pw);`,
      options: [{ allowInTests: true }],
      filename: 'auth.test.ts',
    },

    // --- the partition -------------------------------------------------------
    // Bearer credentials belong to no-jwt-in-storage…
    { code: `localStorage.setItem('access_token', jwt);` },
    { code: `localStorage.setItem('sessionId', id);` },
    // …and a provable JWT value likewise, whatever the key is called.
    {
      code: `localStorage.setItem('secret_backup', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhIjoxfQ.sig');`,
    },
    // sessionStorage belongs to no-sensitive-sessionstorage by default.
    { code: `sessionStorage.setItem('password', pw);` },
    { code: `sessionStorage.setItem('api_key', k);` },

    // --- whole-word, not substring ------------------------------------------
    // Every one reported on the shipped rule.
    { code: `localStorage.setItem('article-author', name);` },
    { code: `localStorage.setItem('tokenizer-config', cfg);` },
    { code: `localStorage.setItem('user-session', id);` },
    { code: `localStorage.setItem('creditLimit', 5000);` },
    { code: `localStorage.setItem('passwordLength', '12');` },

    // --- Judge the key that is WRITTEN, not the constant that holds it ------
    // The okta-signin-widget shape: a constant named after the storage API.
    {
      code: `
        const STATE_HANDLE_LOCAL_STORAGE_KEY = 'osw-oie-state-handle';
        localStorage.setItem(STATE_HANDLE_LOCAL_STORAGE_KEY, stateHandle);
      `,
    },
    {
      code: `
        const LAST_INITIATED_LOGIN_URL_LOCAL_STORAGE_KEY = 'osw-oie-last-initiated-login-url';
        localStorage.setItem(LAST_INITIATED_LOGIN_URL_LOCAL_STORAGE_KEY, window.location.href);
      `,
    },
    {
      code: `
        const PREFS_LOCAL_STORAGE_KEY = 'ui-prefs';
        localStorage[PREFS_LOCAL_STORAGE_KEY] = JSON.stringify(prefs);
      `,
    },
    // A key expression we cannot resolve to a string at all says nothing.
    { code: `localStorage.setItem(makeKey(id), value);` },
    { code: `localStorage[computeKey()] = value;` },
    // setItem without a value is not a write we can judge.
    { code: `localStorage.setItem('password');` },
    // Not a member-expression assignment target.
    { code: `[a] = b;` },
  ],
  invalid: [
    {
      code: `localStorage.setItem('password', pwd);`,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    {
      code: `localStorage.setItem('api_key', key);`,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    {
      code: `localStorage.setItem('private_key', pem);`,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    {
      code: `localStorage.setItem('creditCardNumber', pan);`,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    // Unresolvable identifier key falls back to its spelling.
    {
      code: `localStorage.setItem(password, value);`,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    // Non-computed member access IS the key name.
    {
      code: `localStorage.secret = secretValue;`,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    {
      code: `localStorage['apiKey'] = keyValue;`,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    // allowInTests: false in a test file
    {
      code: `localStorage.setItem('password', pw);`,
      filename: 'auth.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    // checkSessionStorage: true deliberately re-enables the overlap.
    {
      code: `sessionStorage.setItem('password', pw);`,
      options: [{ checkSessionStorage: true }],
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
          data: { key: 'password', storage: 'sessionStorage' },
        },
      ],
    },

    // --- FN locks for the resolution change --------------------------------
    {
      code: `
        const K = 'private_key';
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
    // A binding that cannot be resolved falls back to the spelling.
    {
      code: `function save(apiKey, value) { localStorage.setItem(apiKey, value); }`,
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
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
          data: { key: 'password', storage: 'localStorage' },
        },
      ],
    },
    {
      code: 'globalThis.localStorage.setItem("apiKey", k);',
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
          data: { key: 'apiKey', storage: 'localStorage' },
        },
      ],
    },
    {
      code: 'window.localStorage.privateKey = t;',
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
          data: { key: 'privateKey', storage: 'localStorage' },
        },
      ],
    },
  ],
});

/**
 * Regression lock — computed and optional-chained sinks.
 */
ruleTester.run(
  'lock: computed and optional-chained sinks',
  noSensitiveLocalstorage,
  {
    valid: [
      { code: `localStorage['getItem']('password');` },
      { code: `localStorage[method]('password', pw);` },
    ],
    invalid: [
      {
        code: `localStorage['setItem']('password', pw);`,
        errors: [{ messageId: 'sensitiveLocalStorage' }],
      },
      {
        code: `window.localStorage?.setItem('api_key', k);`,
        errors: [{ messageId: 'sensitiveLocalStorage' }],
      },
    ],
  },
);

/**
 * `sensitivePatterns` REPLACES the default vocabulary. The same code must give
 * a different verdict with and without it, or the option proves nothing.
 */
ruleTester.run(
  'option: sensitivePatterns replaces the vocabulary',
  noSensitiveLocalstorage,
  {
    valid: [
      // `password` is in the DEFAULT list but not in this one.
      {
        code: 'localStorage.setItem("password", pw);',
        options: [{ sensitivePatterns: ['dossier'] }],
      },
      // And a project word is not sensitive by default.
      { code: 'localStorage.setItem("dossier", d);' },
      // A configured bearer term still cannot resurrect the double report —
      // the deferral is structural and runs first.
      {
        code: 'localStorage.setItem("access_token", t);',
        options: [{ sensitivePatterns: ['token'] }],
      },
    ],
    invalid: [
      {
        code: 'localStorage.setItem("password", pw);',
        errors: [
          {
            messageId: 'sensitiveLocalStorage',
            data: { key: 'password', storage: 'localStorage' },
          },
        ],
      },
      {
        code: 'localStorage.setItem("dossier", d);',
        options: [{ sensitivePatterns: ['dossier'] }],
        errors: [
          {
            messageId: 'sensitiveLocalStorage',
            data: { key: 'dossier', storage: 'localStorage' },
          },
        ],
      },
    ],
  },
);

/**
 * ADVERSARIAL WAVE — the three shapes that took this rule to 78.6% recall on
 * `benchmarks/rule-corpus/browser-security__no-sensitive-localstorage`.
 */
ruleTester.run('lock: adversarial wave', noSensitiveLocalstorage, {
  valid: [
    // `localStorage` as a local binding is not the browser global.
    {
      code: `export function seed(localStorage) { localStorage.setItem('password', 'fake'); }`,
    },
    { code: `const { localStorage: store } = fakeWindow; store.setItem('password', pw);` },
  ],
  invalid: [
    {
      code: `const WRITE = 'setItem'; localStorage[WRITE]('user_password', pw);`,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    {
      code: 'localStorage.setItem(`user:${id}:api_key`, key);',
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
    {
      code: `const { localStorage: store } = window; store.setItem('private_key', pem);`,
      errors: [
        {
          messageId: 'sensitiveLocalStorage',
          data: { key: 'private_key', storage: 'localStorage' },
        },
      ],
    },
    // Keys are usually plural. Whole-word matching must fold regular plurals or
    // it trades a false-positive class for a false-negative one.
    {
      code: `localStorage.setItem('passwords', JSON.stringify(vault));`,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
  ],
});
