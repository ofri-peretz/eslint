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
    // Note: Variable names like 'tokenKey' are NOT flagged to reduce false positives
    // We only flag when the actual key is clearly a JWT-related name
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
    // Variable key that looks like JWT (identifier detection)
    {
      code: `localStorage.setItem(accessToken, value);`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'accessToken', storage: 'localStorage' } }],
    },
    // Identifier property access assignment
    {
      code: `localStorage.jwt = tokenValue;`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'jwt', storage: 'localStorage' } }],
    },
    // sessionStorage with identifier key
    {
      code: `sessionStorage.setItem(refreshToken, value);`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'refreshToken', storage: 'sessionStorage' } }],
    },
    // Direct assignment with JWT value
    {
      code: `localStorage['userData'] = '${EXAMPLE_JWT}';`,
      errors: [{ messageId: 'jwtInStorage', data: { key: 'userData', storage: 'localStorage' } }],
    },
  ],
});

/**
 * Regression lock — `window.localStorage` is `localStorage`.
 *
 * The rule matched only the bare identifier, so spelling the global out — the
 * form every no-implicit-globals lint rule asks for — hid the token entirely.
 */
ruleTester.run('lock: the global may be spelled out', noJwtInStorage, {
  valid: [
    // A wrapper that merely CONTAINS the word is not the global.
    { code: 'myLocalStorageWrapper.setItem("access_token", jwt);' },
    { code: 'const store = { localStorage: fake }; store.localStorage.setItem("access_token", jwt);' },
    // `top` and `parent` name a DIFFERENT window; reading storage off them is
    // a cross-origin access, not this sink.
    { code: 'top.localStorage.setItem("access_token", jwt);' },
    { code: 'parent.sessionStorage.setItem("access_token", jwt);' },
    // A computed read proves nothing about which global it lands on.
    { code: 'window[storageName].setItem("access_token", jwt);' },
  ],
  invalid: [
    {
      code: 'window.localStorage.setItem("access_token", jwt);',
      errors: [{ messageId: 'jwtInStorage', data: { key: 'access_token', storage: 'localStorage' } }],
    },
    {
      code: 'globalThis.localStorage.setItem("refresh_token", jwt);',
      errors: [{ messageId: 'jwtInStorage', data: { key: 'refresh_token', storage: 'localStorage' } }],
    },
    {
      code: 'self.sessionStorage.setItem("id_token", jwt);',
      errors: [{ messageId: 'jwtInStorage', data: { key: 'id_token', storage: 'sessionStorage' } }],
    },
    // The assignment path, same spelling problem.
    {
      code: 'window.localStorage.authToken = jwt;',
      errors: [{ messageId: 'jwtInStorage', data: { key: 'authToken', storage: 'localStorage' } }],
    },
    {
      code: 'globalThis.sessionStorage["jwt"] = value;',
      errors: [{ messageId: 'jwtInStorage', data: { key: 'jwt', storage: 'sessionStorage' } }],
    },
  ],
});
