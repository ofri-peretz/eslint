/**
 * A hardcoded secret wrapped in bytes is still a hardcoded secret.
 *
 * `jose` takes `Uint8Array` for symmetric keys, and its documented idiom is
 * `new TextEncoder().encode(secret)`. Both rules classified every
 * `CallExpression` key as a safe source, so the single most common way to hand
 * jose a hardcoded HMAC secret was the one shape neither could see — and this
 * plugin's published API-surface coverage counted those APIs as covered.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe } from 'vitest';

import { noHardcodedSecret } from './index';
import { noWeakSecret } from '../no-weak-secret';

const ruleTester = new RuleTester();

describe('no-hardcoded-secret sees through a byte wrapper', () => {
  ruleTester.run('no-hardcoded-secret', noHardcodedSecret, {
    valid: [
      {
        name: 'bytes over an env var stay safe',
        code: `
          import { compactVerify } from 'jose';
          await compactVerify(jws, new TextEncoder().encode(process.env.JWT_SECRET));
        `,
      },
      {
        name: 'a wrapper over an opaque call is still opaque',
        // The value is not visible here, so there is nothing to judge. This is
        // the arm that keeps the change from reporting on every byte key.
        code: `
          import { compactVerify } from 'jose';
          await compactVerify(jws, new TextEncoder().encode(loadSecret()));
        `,
      },
      {
        name: 'an unrelated call is untouched',
        code: `
          import { compactVerify } from 'jose';
          await compactVerify(jws, getKey());
        `,
      },
      {
        // A bare callee that DOES take an argument. `getKey()` above returns
        // before the callee shape is examined at all, so without this the
        // "not a member expression" arm is never reached — and a key loader
        // taking a parameter is the ordinary case, not an exotic one.
        name: 'a key loader called with an argument is still a safe source',
        code: `
          import { compactVerify } from 'jose';
          await compactVerify(jws, getKey('primary'));
        `,
      },
    ],
    invalid: [
      {
        name: "jose's documented HMAC idiom over a literal",
        code: `
          import { compactVerify } from 'jose';
          await compactVerify(jws, new TextEncoder().encode('super-secret-value'));
        `,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: 'Buffer.from over a literal',
        code: `
          import { jwtVerify } from 'jose';
          await jwtVerify(token, Buffer.from('super-secret-value'));
        `,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
      {
        name: 'a const one frame up, wrapped in bytes',
        code: `
          import { compactVerify } from 'jose';
          const SECRET = 'super-secret-value';
          await compactVerify(jws, new TextEncoder().encode(SECRET));
        `,
        errors: [{ messageId: 'hardcodedSecret' }],
      },
    ],
  });
});

describe('no-weak-secret measures the literal inside a byte wrapper', () => {
  ruleTester.run('no-weak-secret', noWeakSecret, {
    valid: [
      {
        name: 'a long secret in bytes is not weak',
        code: `
          import { compactVerify } from 'jose';
          await compactVerify(jws, new TextEncoder().encode('a-sufficiently-long-and-random-secret-value-32'));
        `,
      },
      {
        // 64 hex characters ARE 32 bytes. The floor is a byte count, so the
        // decode has to be able to clear it as well as fail it.
        name: 'a 64-character hex key really is 32 bytes',
        code: `
          import jwt from 'jsonwebtoken';
          jwt.sign({ a: 1 }, Buffer.from('00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff', 'hex'));
        `,
      },
      {
        name: 'a 44-character base64 key is 32 bytes once its padding is dropped',
        code: `
          import jwt from 'jsonwebtoken';
          jwt.sign({ a: 1 }, Buffer.from('AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=', 'base64'));
        `,
      },
      {
        // An encoding Buffer does not decode is not an excuse to shrink the
        // count: utf8 and its neighbours are one byte per character at worst.
        name: 'an unencoded Buffer key is measured as written',
        code: `
          import jwt from 'jsonwebtoken';
          jwt.sign({ a: 1 }, Buffer.from('a-sufficiently-long-and-random-secret-value-32', 'utf8'));
        `,
      },
    ],
    invalid: [
      {
        name: 'a short secret is as weak in bytes as it is bare',
        code: `
          import { compactVerify } from 'jose';
          await compactVerify(jws, new TextEncoder().encode('short'));
        `,
        errors: [{ messageId: 'shortSecret' }],
      },
      {
        /*
         * A key's length in the source and its strength are different numbers
         * the moment an encoding is named. 32 hex characters are 16 bytes —
         * half the default floor — and counting characters called it long
         * enough and said nothing.
         */
        name: 'a 32-character hex key is 16 bytes and under the floor',
        code: `
          import jwt from 'jsonwebtoken';
          jwt.sign({ a: 1 }, Buffer.from('00112233445566778899aabbccddeeff', 'hex'));
        `,
        errors: [{ messageId: 'shortSecret' }],
      },
      {
        name: 'a 32-character base64url key is 24 bytes and under the floor',
        code: `
          import jwt from 'jsonwebtoken';
          jwt.sign({ a: 1 }, Buffer.from('AAECAwQFBgcICQoLDA0ODxAREhMUFRYX', 'base64url'));
        `,
        errors: [{ messageId: 'shortSecret' }],
      },
    ],
  });
});
