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
    {
      name: 'a plain-string record put on a store is a value, not a store name',
      code: "const store = tx.objectStore('tips'); store.put('Change your password monthly', 'tip-1');",
    },
    { name: 'an ordinary store', code: `db.createObjectStore('users');` },
    {
      name: 'a non-sensitive store name',
      code: `db.createObjectStore('settings');`,
    },
    { code: `db.createObjectStore('passwords');`, filename: 'db.test.ts' },
    {
      name: 'a createObjectStore call with no name names nothing sensitive',
      code: `db.createObjectStore();`,
    },
    { code: `db.createObjectStore(computeName());` },

    // --- the .add/.put sink must be an IDBObjectStore ------------------------
    // PRE-EXISTING DEFECT, now fixed: the rule reported EVERY `.add`/`.put` in
    // the program. `store.add({ password })` was in its own invalid[] list with
    // `store` bound to nothing at all. None of these is a database.
    { code: `jobQueue.add({ credential: c });` },
    { code: `reduxStore.put({ password: p });` },
    { code: `set.add({ apiKey: k });` },
    // A member-expression receiver is not a resolvable object store.
    { code: `db.queue.add({ apiKey: k });` },
    { code: `store.add({ name: 'John', email: 'john@example.com' });` },
    { code: `store.put({ id: 1, data: 'value' });` },

    // A real store, non-sensitive payload.
    {
      code: `const store = tx.objectStore('profiles'); store.put({ id: 1, nickname: n });`,
    },
    // A real store, but the payload is not an object literal we can read.
    {
      code: `const store = tx.objectStore('vault'); store.put(record);`,
    },
    {
      code: `const store = tx.objectStore('vault'); store.put();`,
    },
    // A fact ABOUT a secret is not the secret.
    {
      code: `const store = tx.objectStore('vault'); store.put({ tokenCount: 3 });`,
    },
    // Whole word, not substring.
    { code: `db.createObjectStore('spinner-state');` },
    { code: `db.createObjectStore('authors');` },
  ],
  invalid: [
    {
      name: 'a shorthand property names its key, not the value bound to it',
      code: "const accessToken = `${header}.${payload}`; const store = tx.objectStore('v'); store.add({ accessToken });",
      errors: [{ messageId: 'sensitiveInIndexedDB' }],
    },
    {
      name: 'an object store named for the secrets it holds',
      code: `db.createObjectStore('passwords');`,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'passwords' } },
      ],
    },
    {
      name: 'an IndexedDB object store named secrets is reported',
      code: `db.createObjectStore('secrets');`,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'secrets' } },
      ],
    },
    {
      code: `db.createObjectStore('apiKeys');`,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'apiKeys' } },
      ],
    },
    {
      code: `db.createObjectStore('credentials');`,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'credentials' } },
      ],
    },
    // Bearer credentials ARE in scope here — no-jwt-in-storage only covers Web
    // Storage, so deferring them would be a false negative.
    {
      code: `db.createObjectStore('auth-tokens');`,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'auth-tokens' } },
      ],
    },
    // The store name resolved through a constant.
    {
      code: `
        const STORE = 'password-vault';
        db.createObjectStore(STORE);
      `,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'password-vault' } },
      ],
    },
    // .put/.add on a PROVEN object store.
    {
      code: `const store = tx.objectStore('vault'); store.put({ apiKey: key, user: 'admin' });`,
      errors: [{ messageId: 'sensitiveInIndexedDB', data: { name: 'apiKey' } }],
    },
    {
      code: `const store = tx.objectStore('vault'); store.add({ password: userPassword, email: 'test@test.com' });`,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'password' } },
      ],
    },
    // Inline, without a binding.
    {
      code: `db.transaction('v', 'readwrite').objectStore('v').put({ ssn: s });`,
      errors: [{ messageId: 'sensitiveInIndexedDB', data: { name: 'ssn' } }],
    },
    // A computed method name is the same call.
    {
      code: `const store = tx.objectStore('vault'); store['put']({ privateKey: pem });`,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'privateKey' } },
      ],
    },
    // A quoted property key.
    {
      code: `const store = tx.objectStore('vault'); store.put({ 'credit_card_number': pan });`,
      errors: [
        {
          messageId: 'sensitiveInIndexedDB',
          data: { name: 'credit_card_number' },
        },
      ],
    },
    // A spread element is not a key we can read; the sibling still reports.
    {
      code: `const store = tx.objectStore('vault'); store.put({ ...rest, password: p });`,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'password' } },
      ],
    },
    // A computed property key we cannot resolve.
    {
      code: `const store = tx.objectStore('vault'); store.put({ [k]: v, secret: s });`,
      errors: [{ messageId: 'sensitiveInIndexedDB', data: { name: 'secret' } }],
    },
    {
      code: `db.createObjectStore('passwords');`,
      filename: 'db.test.ts',
      options: [{ allowInTests: false }],
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'passwords' } },
      ],
    },
    // additionalPatterns adds to the vocabulary.
    {
      code: `db.createObjectStore('dossiers');`,
      options: [{ additionalPatterns: ['dossier'] }],
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'dossiers' } },
      ],
    },
  ],
});

/**
 * ADVERSARIAL WAVE — the two shapes that took this rule to 84.6% recall on
 * `benchmarks/rule-corpus/browser-security__no-sensitive-indexeddb`.
 *
 * The `idb` package is the bigger of the two: it is how most production code
 * touches IndexedDB, and its `db.put(storeName, value)` shape shares no AST
 * with the raw `objectStore(name).put(value)` the rule was written against.
 */
ruleTester.run('lock: adversarial wave', noSensitiveIndexeddb, {
  valid: [
    // A `put` on something that is not a database, however it is spelled.
    {
      code: `const db = await openSomethingElse('app'); await db.put('vault', { password: p });`,
    },
    {
      code: `
        import { openDB } from 'idb';
        const db = await openDB('app', 1);
        await db.put('profiles', { id: 1, nickname: n });
      `,
    },
    {
      code: `
        import { openDB } from 'idb';
        const db = await openDB('app', 1);
        await db.put('vault', record);
      `,
    },
    {
      code: `
        import { openDB } from 'idb';
        const db = await openDB('app', 1);
        await db.put();
      `,
    },
    // An alias chain that never reaches an object store.
    { code: `const target = somethingElse; target.put({ password: p });` },
    {
      name: 'a neutral out-of-line record key is not reported',
      code: `const store = tx.objectStore('prefs'); store.put(value, 'theme');`,
    },
  ],
  invalid: [
    // 1. The `idb` package: the STORE NAME is argument 0, the record argument 1.
    {
      code: `
        import { openDB } from 'idb';
        const db = await openDB('app', 1);
        await db.put('vault', { id: 1, password: user.password });
      `,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'password' } },
      ],
    },
    {
      code: `
        import { openDB } from 'idb';
        const db = await openDB('app', 1);
        await db.add('credentials', { id: 1, value: v });
      `,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'credentials' } },
      ],
    },
    // 2. The object store reached through an alias.
    {
      code: `
        const tx = db.transaction('vault', 'readwrite');
        const store = tx.objectStore('vault');
        const target = store;
        target.put({ id: 1, api_key: integration.key });
      `,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'api_key' } },
      ],
    },
    {
      name: 'an out-of-line record key names the record, so store.put(value, password) is reported',
      code: `const store = db.transaction('vault', 'readwrite').objectStore('vault'); store.put(value, 'password');`,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'password' } },
      ],
    },
    {
      name: 'the idb wrapper takes the out-of-line key third, so db.put(store, value, apiKey) is reported',
      code: `
        import { openDB } from 'idb';
        const db = await openDB('app', 1);
        await db.put('vault', value, 'apiKey');
      `,
      errors: [{ messageId: 'sensitiveInIndexedDB', data: { name: 'apiKey' } }],
    },
    // Shorthand property — the field is still named.
    {
      code: `const store = tx.objectStore('vault'); const password = form.password; store.put({ id: 1, password });`,
      errors: [
        { messageId: 'sensitiveInIndexedDB', data: { name: 'password' } },
      ],
    },
  ],
});
