/**
 * Tests for no-jwt-in-storage rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noJwtInStorage } from './index';
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

// Example JWT for testing
const EXAMPLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

ruleTester.run('no-jwt-in-storage', noJwtInStorage, {
  valid: [
    // Non-sensitive storage
    {
      code: `localStorage.setItem('theme', 'dark');`,
    },
    {
      code: `sessionStorage.setItem('locale', 'en-US');`,
    },
    {
      code: `localStorage.setItem('preference', 'compact');`,
    },
    // Reading storage is fine
    {
      code: `const theme = localStorage.getItem('theme');`,
    },
    // Not storage API
    {
      code: `myStorage.setItem('token', jwt);`,
    },
    // Test files allowed by default
    {
      code: `localStorage.setItem('token', jwt);`,
      filename: 'auth.test.ts',
    },
    {
      code: `sessionStorage.setItem('accessToken', token);`,
      filename: 'token.spec.js',
    },
    // Non-JWT values (even with JWT-like key)
    {
      code: `localStorage.setItem('tokenCount', '5');`,
    },
  ],
  invalid: [
    // JWT key patterns - localStorage
    {
      code: `localStorage.setItem('jwt', token);`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'jwt', storage: 'localStorage' } }],
    },
    {
      code: `localStorage.setItem('token', authToken);`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'token', storage: 'localStorage' } }],
    },
    {
      code: `localStorage.setItem('accessToken', result.token);`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'accessToken', storage: 'localStorage' } }],
    },
    {
      code: `localStorage.setItem('access_token', response.access_token);`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'access_token', storage: 'localStorage' } }],
    },
    {
      code: `localStorage.setItem('refreshToken', refresh);`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'refreshToken', storage: 'localStorage' } }],
    },
    {
      code: `localStorage.setItem('id_token', idToken);`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'id_token', storage: 'localStorage' } }],
    },
    // JWT key patterns - sessionStorage
    {
      code: `sessionStorage.setItem('jwt', token);`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'jwt', storage: 'sessionStorage' } }],
    },
    {
      code: `sessionStorage.setItem('authToken', auth.token);`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'authToken', storage: 'sessionStorage' } }],
    },
    // JWT value detection
    {
      code: `localStorage.setItem('data', '${EXAMPLE_JWT}');`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'data', storage: 'localStorage' } }],
    },
    // Direct assignment with JWT key
    {
      code: `localStorage['token'] = jwt;`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'token', storage: 'localStorage' } }],
    },
    {
      code: `sessionStorage['accessToken'] = token;`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'accessToken', storage: 'sessionStorage' } }],
    },
    // Variable as key (using variable name)
    {
      code: `localStorage.setItem(tokenKey, value);`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'tokenKey', storage: 'localStorage' } }],
    },
    // Bearer token
    {
      code: `localStorage.setItem('bearer', authBearer);`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'bearer', storage: 'localStorage' } }],
    },
    // Test file with allowInTests: false
    {
      code: `localStorage.setItem('jwt', token);`,
      filename: 'auth.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'jwtInStorage', data: { key: 'jwt', storage: 'localStorage' } }],
    },
  ],
});
