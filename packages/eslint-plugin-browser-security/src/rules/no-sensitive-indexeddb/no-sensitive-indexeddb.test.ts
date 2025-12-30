/**
 * Tests for no-sensitive-indexeddb rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSensitiveIndexeddb } from './index';
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

ruleTester.run('no-sensitive-indexeddb', noSensitiveIndexeddb, {
  valid: [
    { code: `db.createObjectStore('users');` },
    { code: `db.createObjectStore('settings');` },
    { code: `store.add({ name: 'John', email: 'john@example.com' });` },
    { code: `store.put({ id: 1, data: 'value' });` },
    { code: `db.createObjectStore('passwords');`, filename: 'db.test.ts' },
  ],
  invalid: [
    {
      code: `db.createObjectStore('passwords');`,
      errors: [{ messageId: 'sensitiveInIndexedDB', data: { name: 'passwords' } }],
    },
    {
      code: `db.createObjectStore('secrets');`,
      errors: [{ messageId: 'sensitiveInIndexedDB', data: { name: 'secrets' } }],
    },
    {
      code: `db.createObjectStore('apiKeys');`,
      errors: [{ messageId: 'sensitiveInIndexedDB', data: { name: 'apiKeys' } }],
    },
    {
      code: `db.createObjectStore('credentials');`,
      errors: [{ messageId: 'sensitiveInIndexedDB', data: { name: 'credentials' } }],
    },
    {
      code: `store.add({ password: userPassword, email: 'test@test.com' });`,
      errors: [{ messageId: 'sensitiveInIndexedDB', data: { name: 'password' } }],
    },
    {
      code: `store.put({ apiKey: key, user: 'admin' });`,
      errors: [{ messageId: 'sensitiveInIndexedDB', data: { name: 'apiKey' } }],
    },
    {
      code: `db.createObjectStore('passwords');`,
      filename: 'db.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'sensitiveInIndexedDB', data: { name: 'passwords' } }],
    },
  ],
});
