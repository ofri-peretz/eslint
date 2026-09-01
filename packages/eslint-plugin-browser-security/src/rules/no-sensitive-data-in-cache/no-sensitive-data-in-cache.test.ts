/**
 * Tests for no-sensitive-data-in-cache
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';

import { noSensitiveDataInCache } from './index';

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

ruleTester.run('no-sensitive-data-in-cache', noSensitiveDataInCache, {
  valid: [
    { name: 'nothing is cached', code: `const x = 1;` },

    // --- PRE-EXISTING DEFECT, now fixed -------------------------------------
    // The rule checked NO sink. Any `.set`/`.put`/`.store` whose first argument
    // was a string containing 'password', 'token', 'credit' or 'ssn' was a
    // CWE-200 finding — and the old test file asserted exactly these as
    // correct. None of them is a cache.
    { code: `cache.set('password', pwd);` },
    { code: `cache.put('token', authToken);` },
    { code: `cache.store('creditCard', card);` },
    { code: `cache.set('ssn', socialSecurity);` },
    { code: `cacheMap.set('creditLimit', 5000);` },
    { code: `metrics.set('token_count', 42);` },

    // A real Cache, non-sensitive resources.
    {
      code: `const cache = await caches.open('v1'); await cache.addAll(['/shell.html', '/app.js']);`,
    },
    { code: `const cache = await caches.open('v1'); await cache.put(req, res);` },
    // Reads are not writes.
    { code: `const cache = await caches.open('v1'); await cache.match('/api/me/ssn');` },
    { code: `await caches.match('/api/me/ssn');` },
    // A Cache we cannot resolve.
    { code: `someCache.put('/api/me/ssn', res);` },
    // A member-expression receiver is not a resolvable Cache.
    { code: `registry.caches.put('/api/me/ssn', res);` },
    // new Request() with no URL.
    {
      code: `const cache = await caches.open('v1'); await cache.put(new Request(), res);`,
    },
    { code: `cache.put('/api/me/ssn', res);` },
    // addAll with a non-array argument, or elements we cannot read.
    {
      code: `const cache = await caches.open('v1'); await cache.addAll(manifest);`,
    },
    {
      code: `const cache = await caches.open('v1'); await cache.addAll([urlFor(x), ...rest, ,]);`,
    },
    {
      code: `const cache = await caches.open('v1'); await cache.put();`,
    },
    // Test files allowed by default.
    {
      code: `const cache = await caches.open('v1'); await cache.put('/api/me/ssn', res);`,
      filename: 'sw.test.ts',
    },
  ],
  invalid: [
    // The awaited-binding form.
    {
      name: 'a response holding an SSN put in the Cache API',
      code: `const cache = await caches.open('v1'); await cache.put('/api/me/ssn', res);`,
      errors: [
        { messageId: 'sensitiveInCache', data: { resource: '/api/me/ssn' } },
      ],
    },
    // The `.then(cache => …)` form.
    {
      code: `caches.open('v1').then((c) => c.put('/api/session/token', res));`,
      errors: [
        {
          messageId: 'sensitiveInCache',
          data: { resource: '/api/session/token' },
        },
      ],
    },
    // Inline, no binding at all.
    {
      code: `(await caches.open('v1')).add('/account/credit-card');`,
      errors: [
        {
          messageId: 'sensitiveInCache',
          data: { resource: '/account/credit-card' },
        },
      ],
    },
    // A precache manifest that includes an authenticated endpoint.
    {
      code: `const cache = await caches.open('v1'); await cache.addAll(['/shell.html', '/api/me/api-key']);`,
      errors: [
        { messageId: 'sensitiveInCache', data: { resource: '/api/me/api-key' } },
      ],
    },
    // A Request object with a literal URL.
    {
      code: `const cache = await caches.open('v1'); await cache.put(new Request('/api/me/password'), res);`,
      errors: [
        {
          messageId: 'sensitiveInCache',
          data: { resource: '/api/me/password' },
        },
      ],
    },
    // `self.caches` — the service-worker spelling.
    {
      code: `const cache = await self.caches.open('v1'); await cache.add('/api/session');`,
      errors: [
        { messageId: 'sensitiveInCache', data: { resource: '/api/session' } },
      ],
    },
    // A computed method name is the same call.
    {
      code: `const cache = await caches.open('v1'); await cache['put']('/api/me/ssn', res);`,
      errors: [{ messageId: 'sensitiveInCache' }],
    },
    // The URL resolved through a constant.
    {
      code: `
        const URL_ = '/api/me/ssn';
        const cache = await caches.open('v1');
        await cache.put(URL_, res);
      `,
      errors: [{ messageId: 'sensitiveInCache' }],
    },
    {
      code: `const cache = await caches.open('v1'); await cache.put('/api/me/ssn', res);`,
      filename: 'sw.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'sensitiveInCache' }],
    },
  ],
});
