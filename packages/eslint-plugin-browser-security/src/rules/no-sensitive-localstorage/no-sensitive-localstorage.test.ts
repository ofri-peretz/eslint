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
  ],
});
