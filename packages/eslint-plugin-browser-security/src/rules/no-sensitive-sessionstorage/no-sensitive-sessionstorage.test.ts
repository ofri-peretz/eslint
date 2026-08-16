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
    { code: `sessionStorage.setItem('theme', 'dark');` },
    { code: `sessionStorage.setItem('locale', 'en-US');` },
    { code: `sessionStorage.setItem('searchQuery', 'test');` },
    { code: `sessionStorage.getItem('password');` },
    { code: `myStorage.setItem('password', value);` },
    { code: `sessionStorage.setItem('password', value);`, filename: 'auth.test.ts' },
  ],
  invalid: [
    {
      code: `sessionStorage.setItem('password', userPassword);`,
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'password' } }],
    },
    {
      code: `sessionStorage.setItem('apiKey', key);`,
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'apiKey' } }],
    },
    {
      code: `sessionStorage.setItem('secret', value);`,
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'secret' } }],
    },
    {
      code: `sessionStorage.setItem('accessToken', token);`,
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'accessToken' } }],
    },
    {
      code: `sessionStorage.setItem('creditCard', cardNumber);`,
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'creditCard' } }],
    },
    {
      code: `sessionStorage['password'] = value;`,
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'password' } }],
    },
    {
      code: `sessionStorage.setItem('password', value);`,
      filename: 'auth.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'password' } }],
    },
    // Variable key that looks sensitive (identifier detection)
    {
      code: `sessionStorage.setItem(password, value);`,
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'password' } }],
    },
    // Identifier property access with sensitive name
    {
      code: `sessionStorage.apiKey = keyValue;`,
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'apiKey' } }],
    },
    // Bracket with string literal (another pattern)
    {
      code: `sessionStorage['authToken'] = tokenValue;`,
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'authToken' } }],
    },
    // Custom additionalPatterns. `userPin` used to be the fixture here, but
    // `/pin/i` is already in the DEFAULT vocabulary — it reported with or
    // without the option, so it proved nothing about the option. `dossier` is
    // not a default, so the verdict genuinely depends on the configuration.
    {
      code: `sessionStorage.setItem('userDossier', d);`,
      options: [{ additionalPatterns: ['dossier'] }],
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'userDossier' } }],
    },
  ],
});

/**
 * Regression lock — `window.sessionStorage` is `sessionStorage`.
 */
ruleTester.run('lock: the global may be spelled out', noSensitiveSessionstorage, {
  valid: [
    { code: 'mySessionStorageShim.setItem("password", pw);' },
    { code: 'top.sessionStorage.setItem("password", pw);' },
    // additionalPatterns at its default does not know `dossier`.
    { code: 'window.sessionStorage.setItem("userDossier", d);' },
  ],
  invalid: [
    {
      code: 'window.sessionStorage.setItem("password", pw);',
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'password' } }],
    },
    {
      code: 'globalThis.sessionStorage.setItem("apiKey", k);',
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'apiKey' } }],
    },
    {
      code: 'self.sessionStorage.authToken = t;',
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'authToken' } }],
    },
    // Same code as the valid case above — the option is what changes it.
    {
      code: 'window.sessionStorage.setItem("userDossier", d);',
      options: [{ additionalPatterns: ['dossier'] }],
      errors: [{ messageId: 'sensitiveInSessionStorage', data: { key: 'userDossier' } }],
    },
  ],
});
