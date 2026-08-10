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
