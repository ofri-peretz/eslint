/**
 * Tests for no-math-random-crypto rule
 * CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMathRandomCrypto } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: { parser, ecmaVersion: 2022, sourceType: 'module' },
});

describe('no-math-random-crypto', () => {
  describe('Valid Code - Non-Crypto Context', () => {
    ruleTester.run('valid - false positive prevention', noMathRandomCrypto, {
      valid: [
        // Non-crypto variable names
        { code: 'const count = Math.random() * 10;' },
        { code: 'const position = Math.random();' },
        { code: 'const x = Math.random() * width;' },
        { code: 'const y = Math.floor(Math.random() * height);' },
        { code: 'const color = Math.random() * 255;' },
        { code: 'const index = Math.floor(Math.random() * array.length);' },
        // Crypto randomBytes (secure alternative)
        { code: 'const token = crypto.randomBytes(32).toString("hex");' },
        // Test file with allowInTests
        {
          code: 'const secret = Math.random();',
          filename: 'crypto.test.ts',
          options: [{ allowInTests: true }],
        },
        // Similar names that shouldn't trigger (no crypto keywords)
        { code: 'const count = Math.random();' },  // 'count' doesn't match patterns
        { code: 'const value = Math.floor(Math.random());' },  // 'value' doesn't match patterns
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Variable Name Patterns', () => {
    ruleTester.run('invalid - crypto variable names', noMathRandomCrypto, {
      valid: [],
      invalid: [
        // token
        { code: 'const token = Math.random().toString(36);', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'const resetToken = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'const authToken = Math.random().toString(16);', errors: [{ messageId: 'mathRandomCrypto' }] },
        // secret
        { code: 'const secret = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'const sharedSecret = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        // password
        { code: 'const password = Math.random().toString(36);', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'const tempPassword = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        // key
        { code: 'const key = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'const encryptionKey = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        // salt
        { code: 'const salt = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        // iv / nonce
        { code: 'const iv = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'const nonce = Math.random().toString();', errors: [{ messageId: 'mathRandomCrypto' }] },
        // session
        { code: 'const sessionId = Math.random().toString(16);', errors: [{ messageId: 'mathRandomCrypto' }] },
        // csrf
        { code: 'const csrf = Math.random().toString(36);', errors: [{ messageId: 'mathRandomCrypto' }] },
        // otp
        { code: 'const otp = Math.floor(Math.random() * 1000000);', errors: [{ messageId: 'mathRandomCrypto' }] },
        // pin / code
        { code: 'const pin = Math.floor(Math.random() * 10000);', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'const verifyCode = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        // hash / cipher / encrypt / auth
        { code: 'const hash = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'const cipher = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
      ],
    });
  });

  describe('Invalid Code - Function Context', () => {
    ruleTester.run('invalid - crypto function names', noMathRandomCrypto, {
      valid: [],
      invalid: [
        // Function declaration
        { code: 'function generateToken() { return Math.random(); }', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'function createSecret() { return Math.random().toString(36); }', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'function genPassword() { return Math.random(); }', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'function getRandomId() { return Math.random(); }', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'function randomString() { return Math.random().toString(36); }', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'function makeSalt() { return Math.random(); }', errors: [{ messageId: 'mathRandomCrypto' }] },
      ],
    });
  });

  describe('Invalid Code - Object Property Context', () => {
    ruleTester.run('invalid - property assignments', noMathRandomCrypto, {
      valid: [],
      invalid: [
        // Object property
        { code: 'const obj = { token: Math.random() };', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'const config = { secret: Math.random() };', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'const user = { password: Math.random().toString() };', errors: [{ messageId: 'mathRandomCrypto' }] },
        // Member assignment
        { code: 'obj.secret = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'user.token = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        { code: 'session.key = Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
      ],
    });
  });

  describe('Edge Cases - Complex Patterns', () => {
    ruleTester.run('invalid - complex contexts', noMathRandomCrypto, {
      valid: [],
      invalid: [
        // Template literal
        { code: 'const token = `prefix-${Math.random()}-suffix`;', errors: [{ messageId: 'mathRandomCrypto' }] },
        // Concatenation
        { code: 'const secret = "sec-" + Math.random();', errors: [{ messageId: 'mathRandomCrypto' }] },
        // Ternary
        { code: 'const token = true ? Math.random() : null;', errors: [{ messageId: 'mathRandomCrypto' }] },
        // Multiple Math.random in crypto context
        { code: 'const token = Math.random().toString(36) + Math.random().toString(36);', errors: [{ messageId: 'mathRandomCrypto' }, { messageId: 'mathRandomCrypto' }] },
      ],
    });
  });

  describe('Benchmark FP/FN Regression', () => {
    ruleTester.run('benchmark regression', noMathRandomCrypto, {
      valid: [
        // safe_random_shuffle — Fisher-Yates shuffle for UI, not crypto
        {
          code: `
            function safe_random_shuffle(array) {
              const shuffled = [...array];
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }
              return shuffled;
            }
          `,
        },
      ],
      invalid: [
        // vuln_random_token — Math.random() used for token generation
        {
          code: `
            function vuln_random_token() {
              return Math.random().toString(36).substring(2);
            }
          `,
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
        // vuln_random_session — Math.random() used for session ID
        {
          code: `
            function vuln_random_session() {
              return "session_" + Math.floor(Math.random() * 1000000);
            }
          `,
          errors: [{ messageId: 'mathRandomCrypto' }],
        },
      ],
    });
  });
});
