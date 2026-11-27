/**
 * jose checks the key against the token's `alg` before it verifies, so a key
 * that is a key set, raw bytes or an imported key already fixes which family
 * can verify. Real-repo shapes (adoption scan 2026-11-26): Payload's
 * `jwtVerify(token, new TextEncoder().encode(secret))` and logto's
 * `jwtVerify(token, createLocalJWKSet({ keys }), { issuer, audience })`.
 *
 * A key this file cannot see (a parameter, an unknown call) could be anything,
 * so it keeps being reported.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireAlgorithmWhitelist } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('require-algorithm-whitelist: a jose key that fixes the algorithm family', () => {
  ruleTester.run('jose key-bound', requireAlgorithmWhitelist, {
    valid: [
      {
        name: 'Payload: TextEncoder bytes can only be an HS* secret',
        code: `import { jwtVerify } from 'jose';
export const check = (token, key) => jwtVerify(token, new TextEncoder().encode(key.legacyKey));`,
      },
      {
        name: 'a TextEncoder secret held in a same-file const',
        code: `import { jwtVerify } from 'jose';
const secret = new TextEncoder().encode(process.env.SECRET);
export const check = (id) => jwtVerify(id, secret);`,
      },
      {
        name: 'logto: a local key set binds each key to its own algorithm',
        code: `import { jwtVerify, createLocalJWKSet } from 'jose';
await jwtVerify(token, createLocalJWKSet({ keys }), { issuer, audience });`,
      },
      {
        name: 'a remote key set held in a const',
        code: `import { jwtVerify, createRemoteJWKSet } from 'jose';
const jwks = createRemoteJWKSet(new URL(url));
await jwtVerify(token, jwks);`,
      },
      {
        name: 'a raw Uint8Array secret',
        code: `import { compactVerify } from 'jose';
await compactVerify(jws, new Uint8Array(32));`,
      },
      {
        name: 'a key imported as a typed key',
        code: `import { jwtVerify, importSPKI } from 'jose';
const key = await importSPKI(pem, 'RS256');
await jwtVerify(token, key);`,
      },
      {
        name: 'a renamed key-set import',
        code: `import { jwtVerify, createLocalJWKSet as makeSet } from 'jose';
await jwtVerify(token, makeSet({ keys }));`,
      },
      {
        name: 'the namespace import form',
        code: `import * as jose from 'jose';
await jose.jwtVerify(token, jose.createLocalJWKSet({ keys }));`,
      },
      {
        name: 'a CommonJS require of jose',
        code: `const { jwtVerify, createLocalJWKSet } = require('jose');
jwtVerify(token, createLocalJWKSet({ keys }));`,
      },
    ],
    invalid: [
      {
        name: 'an opaque key (a parameter) is not proven bound',
        code: `import { jwtVerify } from 'jose';
export const check = (token, key) => jwtVerify(token, key);`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a key from a call this file cannot read is not proven bound',
        code: `import { jwtVerify } from 'jose';
await jwtVerify(token, loadKey());`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a different TextEncoder method is not a byte secret',
        code: `import { jwtVerify } from 'jose';
await jwtVerify(token, new TextEncoder().encodeInto(a, b));`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a Uint8Array-looking constructor that is not Uint8Array',
        code: `import { jwtVerify } from 'jose';
await jwtVerify(token, new Foo(32));`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a call on an unrelated member is not a key factory',
        code: `import { jwtVerify } from 'jose';
await jwtVerify(token, keys.createLocalJWKSet());`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'a local createLocalJWKSet wrapper is not jose',
        code: `import { jwtVerify } from 'jose';
import { createLocalJWKSet } from './keys';
await jwtVerify(token, createLocalJWKSet({ keys }));`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
      {
        name: 'jsonwebtoken with a TextEncoder key still needs a list',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, new TextEncoder().encode(secret));`,
        errors: [{ messageId: 'missingAlgorithmWhitelist' }],
      },
    ],
  });
});
