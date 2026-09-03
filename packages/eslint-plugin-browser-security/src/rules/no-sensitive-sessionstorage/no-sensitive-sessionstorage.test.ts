/**
 * Tests for no-sensitive-sessionstorage rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSensitiveSessionstorage } from './index';
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

ruleTester.run('no-sensitive-sessionstorage', noSensitiveSessionstorage, {
  valid: [
    { name: 'a theme preference', code: `sessionStorage.setItem('theme', 'dark');` },
    { code: `sessionStorage.setItem('step', '3');` },
    { code: `const v = sessionStorage.getItem('password');` },
    // Test files allowed by default
    { code: `sessionStorage.setItem('password', pw);`, filename: 'x.test.ts' },

    // --- the partition -------------------------------------------------------
    // localStorage belongs to no-sensitive-localstorage.
    { code: `localStorage.setItem('password', pw);` },
    // Bearer credentials belong to no-jwt-in-storage.
    { code: `sessionStorage.setItem('access_token', t);` },
    { code: `sessionStorage.setItem('sid', s);` },
    // A provable JWT value likewise.
    {
      code: `sessionStorage.setItem('secret_blob', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhIjoxfQ.sig');`,
    },

    // --- whole-word, not substring ------------------------------------------
    // `/pin/i` reported all of these on the shipped rule.
    { code: `sessionStorage.setItem('spinner-visible', '1');` },
    { code: `sessionStorage.setItem('shopping-pinned', ids);` },
    // `/cvc/`, `/ssn/`, `/auth/` behaved the same way.
    { code: `sessionStorage.setItem('article-author', name);` },
    { code: `sessionStorage.setItem('passwordLength', '12');` },

    // Unresolvable keys say nothing.
    { code: `sessionStorage.setItem(makeKey(), v);` },
    { code: `sessionStorage.setItem('password');` },
    // Not a member-expression assignment target.
    { code: `[a] = b;` },
  ],
  invalid: [
    {
      name: 'a password in sessionStorage',
      code: `sessionStorage.setItem('password', pw);`,
      errors: [
        { messageId: 'sensitiveInSessionStorage', data: { key: 'password' } },
      ],
    },
    {
      code: `sessionStorage.setItem('ssn', v);`,
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'ssn' } }],
    },
    {
      code: `sessionStorage.setItem('creditCardNumber', pan);`,
      errors: [
        {
          messageId: 'sensitiveInSessionStorage',
          data: { key: 'creditCardNumber' },
        },
      ],
    },
    {
      code: `sessionStorage.setItem('cvv', c);`,
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'cvv' } }],
    },
    {
      code: `sessionStorage['apiKey'] = k;`,
      errors: [
        { messageId: 'sensitiveInSessionStorage', data: { key: 'apiKey' } },
      ],
    },
    {
      code: `sessionStorage.privateKey = pem;`,
      errors: [
        { messageId: 'sensitiveInSessionStorage', data: { key: 'privateKey' } },
      ],
    },
    {
      code: `sessionStorage.setItem('password', pw);`,
      filename: 'x.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'sensitiveInSessionStorage' }],
    },
    // additionalPatterns ADDS to the vocabulary.
    {
      code: `sessionStorage.setItem('dossier', d);`,
      options: [{ additionalPatterns: ['dossier'] }],
      errors: [
        { messageId: 'sensitiveInSessionStorage', data: { key: 'dossier' } },
      ],
    },
    // Resolution catches a key an unremarkable constant name hides.
    {
      code: `
        const K = 'private_key';
        sessionStorage.setItem(K, v);
      `,
      errors: [
        { messageId: 'sensitiveInSessionStorage', data: { key: 'private_key' } },
      ],
    },
  ],
});

/**
 * Regression lock — the global may be spelled out, computed or optional-chained.
 */
ruleTester.run('lock: sink spellings', noSensitiveSessionstorage, {
  valid: [
    { code: 'mySessionStorageWrapper.setItem("password", pw);' },
    { code: 'top.sessionStorage.setItem("password", pw);' },
    { code: `sessionStorage['getItem']('password');` },
    { code: `sessionStorage[method]('password', pw);` },
  ],
  invalid: [
    {
      code: 'window.sessionStorage.setItem("password", pw);',
      errors: [{ messageId: 'sensitiveInSessionStorage' }],
    },
    {
      code: 'self.sessionStorage.setItem("apiKey", k);',
      errors: [{ messageId: 'sensitiveInSessionStorage' }],
    },
    {
      code: `sessionStorage['setItem']('password', pw);`,
      errors: [{ messageId: 'sensitiveInSessionStorage' }],
    },
    {
      code: `window.sessionStorage?.setItem('ssn', v);`,
      errors: [{ messageId: 'sensitiveInSessionStorage' }],
    },
  ],
});

/**
 * ADVERSARIAL WAVE — the two shapes that took this rule to 83.3% recall on
 * `benchmarks/rule-corpus/browser-security__no-sensitive-sessionstorage`.
 */
ruleTester.run('lock: adversarial wave', noSensitiveSessionstorage, {
  valid: [
    {
      code: `export function seed(sessionStorage) { sessionStorage.setItem('password', 'fake'); }`,
    },
  ],
  invalid: [
    {
      code: `const WRITE = 'setItem'; sessionStorage[WRITE]('cvv', form.cvv);`,
      errors: [{ messageId: 'sensitiveInSessionStorage' }],
    },
    {
      code: 'sessionStorage.setItem(`checkout:${orderId}:credit_card_number`, card.pan);',
      errors: [{ messageId: 'sensitiveInSessionStorage' }],
    },
    {
      code: `const { sessionStorage: store } = window; store.setItem('passphrase', p);`,
      errors: [{ messageId: 'sensitiveInSessionStorage' }],
    },
  ],
});
