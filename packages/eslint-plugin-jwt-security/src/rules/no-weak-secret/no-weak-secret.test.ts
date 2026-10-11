/**
 * Tests for no-weak-secret rule
 * Security: CWE-326 (Encryption Strength)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noWeakSecret } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

// 32+ character strong secret for testing
const STRONG_SECRET = 'ThisIsAVeryStrongSecretThatIs32Ch+';

describe('no-weak-secret', () => {
  describe('Valid Code - Strong Secrets', () => {
    ruleTester.run('valid - strong secrets', noWeakSecret, {
      valid: [
        // Environment variable
        {
          name: 'the secret comes from the environment, length unknown here',
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, process.env.JWT_SECRET);`,
        },
        // Long secret (32+ chars)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, '${STRONG_SECRET}');`,
        },
        // Non-literal (function call)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, getSecret());`,
        },
        // Variable reference
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
        },
        // crypto.randomBytes
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, crypto.randomBytes(32).toString('hex'));`,
        },
        // Verify with env
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, process.env.JWT_SECRET);`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Weak Secrets', () => {
    ruleTester.run('invalid - weak secrets', noWeakSecret, {
      valid: [],
      invalid: [
        // Known weak pattern: "secret"
        {
          name: 'a six-character secret is inside brute-force range',
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, 'secret');`,
          errors: [{ messageId: 'weakSecret' }],
        },
        // Known weak pattern: "password"
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, 'password');`,
          errors: [{ messageId: 'weakSecret' }],
        },
        // Short secret
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, 'short');`,
          errors: [{ messageId: 'shortSecret' }],
        },
        // Just under minimum (31 chars)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, 'abcdefghijklmnopqrstuvwxyz12345');`,
          errors: [{ messageId: 'shortSecret' }],
        },
        // Known weak: test
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, 'testkey');`,
          errors: [{ messageId: 'weakSecret' }],
        },
        // Known weak: demo
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, 'demo123');`,
          errors: [{ messageId: 'weakSecret' }],
        },
        // Template literal with weak value
        {
          code: 'import jwt from "jsonwebtoken";\njwt.sign(payload, `secret`);',
          errors: [{ messageId: 'weakSecret' }],
        },
        // Known weak: changeme
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, 'changeme');`,
          errors: [{ messageId: 'weakSecret' }],
        },
      ],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - custom min length', noWeakSecret, {
      valid: [
        // 16 char secret with minSecretLength: 16
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, 'sixteen_chars!!!');`,
          options: [{ minSecretLength: 16 }],
        },
      ],
      invalid: [
        // 15 chars with minSecretLength: 16
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, 'fifteen_chars!!');`,
          options: [{ minSecretLength: 16 }],
          errors: [{ messageId: 'shortSecret' }],
        },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// FP/FN audit 2026-10
// ---------------------------------------------------------------------------
describe('no-weak-secret — audit 2026-10', () => {
  ruleTester.run('structural key resolution', noWeakSecret, {
    valid: [
      {
        name: 'FP-9: a fixture secret in a test file',
        filename: 'src/auth/auth.middleware.test.ts',
        code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'u1' }, 'test-secret');`,
      },
      {
        name: "FP-3: a node:crypto Sign object's 'base64' encoding is not a secret",
        code: `import jwt from 'jsonwebtoken';
import { createSign } from 'node:crypto';
const signer = createSign('RSA-SHA1');
signer.sign(privateKey, 'base64');`,
      },
      {
        name: 'a long fallback is not weak',
        code: `import jwt from 'jsonwebtoken';
jwt.sign(p, process.env.S || 'a-sufficiently-long-and-random-secret-value-32');`,
      },
    ],
    invalid: [
      {
        name: 'FN-1: a weak || fallback behind an env var',
        code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub }, process.env.JWT_SECRET || 'secret');`,
        errors: [{ messageId: 'weakSecret' }],
      },
      {
        name: 'FN-1: a weak secret one const away',
        code: `import jwt from 'jsonwebtoken';
const JWT_SECRET = 'short';
jwt.sign({ sub }, JWT_SECRET);`,
        errors: [{ messageId: 'shortSecret' }],
      },
      {
        name: "FN-2: jose's SignJWT(...).sign(key) with a weak byte key",
        code: `import { SignJWT } from 'jose';
await new SignJWT({ sub }).setProtectedHeader({ alg: 'HS256' }).sign(new TextEncoder().encode('secret'));`,
        errors: [{ messageId: 'weakSecret' }],
      },
      {
        name: 'FN-3: a NestJS per-call secret that is short',
        code: `import { JwtService } from '@nestjs/jwt';
export const f = (svc, p) => svc.sign(p, { secret: 'tiny', expiresIn: '1h' });`,
        errors: [{ messageId: 'shortSecret' }],
      },
      {
        name: 'FN-4: express-jwt with a short secret',
        code: `import { expressjwt } from 'express-jwt';
expressjwt({ secret: 'shhhhhhared-secret', algorithms: ['HS256'] });`,
        errors: [{ messageId: 'shortSecret' }],
      },
      {
        name: 'a hex byte key resolved through a const keeps its encoding',
        code: `import jwt from 'jsonwebtoken';
const HEX = '00112233445566778899aabbccddeeff';
jwt.sign(p, Buffer.from(HEX, 'hex'));`,
        errors: [{ messageId: 'shortSecret' }],
      },
    ],
  });
});
