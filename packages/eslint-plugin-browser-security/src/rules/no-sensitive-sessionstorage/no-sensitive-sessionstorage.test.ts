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
  ],
});
