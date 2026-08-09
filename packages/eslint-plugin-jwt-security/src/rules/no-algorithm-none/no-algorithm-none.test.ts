/**
 * Tests for no-algorithm-none rule
 * Security: CWE-347 (CVE-2022-23540)
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noAlgorithmNone } from './index';

// Configure RuleTester for Vitest
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

describe('no-algorithm-none', () => {
  describe('Valid Code - Secure Algorithms', () => {
    ruleTester.run('valid - secure algorithms', noAlgorithmNone, {
      valid: [
        // RS256 - RSA with SHA-256
        { code: `jwt.verify(token, publicKey, { algorithms: ['RS256'] });` },
        // ES256 - ECDSA with SHA-256
        { code: `jwt.verify(token, publicKey, { algorithms: ['ES256'] });` },
        // Multiple secure algorithms
        { code: `jwt.verify(token, key, { algorithms: ['RS256', 'RS384', 'RS512'] });` },
        // Single algorithm option
        { code: `jwt.verify(token, secret, { algorithm: 'HS256' });` },
        // jose library
        { code: `jwtVerify(token, key, { algorithms: ['RS256'] });` },
        // No options (doesn't trigger this rule)
        { code: `jwt.verify(token, secret);` },
        // Sign operation with secure algorithm
        { code: `jwt.sign(payload, secret, { algorithm: 'RS256' });` },
        // Spread operator in options (edge case - line 143 coverage)
        { code: `jwt.verify(token, key, { ...opts, algorithms: ['RS256'] });` },
        // Non-algorithm properties (line 152 coverage)
        { code: `jwt.verify(token, key, { issuer: 'auth', complete: true });` },
        // Options without algorithms (different property names)
        { code: `jwt.sign(payload, secret, { expiresIn: '1h', subject: 'user' });` },
        // Variable algorithms (not literal)
        { code: `jwt.verify(token, key, { algorithms: allowedAlgorithms });` },
        // Array with non-literal elements
        { code: `jwt.verify(token, key, { algorithms: [defaultAlg] });` },
        // Non-string literal in array
        { code: `jwt.verify(token, key, { algorithms: [123] });` },
        // Non-JWT function call - edge case (line 199 coverage)
        { code: `console.log('hello');` },
        { code: `someOtherFunction(token, key, { algorithm: 'none' });` },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Algorithm None', () => {
    ruleTester.run('invalid - algorithm none', noAlgorithmNone, {
      valid: [],
      invalid: [
        // Direct 'none' algorithm
        {
          code: `jwt.verify(token, secret, { algorithm: 'none' });`,
          errors: [{ messageId: 'algorithmNone' }],
        },
        // 'none' in algorithms array (single element - gets replaced)
        {
          code: `jwt.verify(token, secret, { algorithms: ['none'] });`,
          errors: [{ messageId: 'algorithmNoneInArray' }],
        },
        // 'none' mixed with other algorithms (no auto-fix for removal)
        {
          code: `jwt.verify(token, secret, { algorithms: ['RS256', 'none'] });`,
          errors: [{ messageId: 'algorithmNoneInArray' }],
        },
        // Case insensitive - 'None'
        {
          code: `jwt.verify(token, secret, { algorithm: 'None' });`,
          errors: [{ messageId: 'algorithmNone' }],
        },
        // Case insensitive - 'NONE'
        {
          code: `jwt.verify(token, secret, { algorithms: ['NONE'] });`,
          errors: [{ messageId: 'algorithmNoneInArray' }],
        },
        // alg shorthand
        {
          code: `jwt.verify(token, secret, { alg: 'none' });`,
          errors: [{ messageId: 'algorithmNone' }],
        },
        // Empty algorithms array
        {
          code: `jwt.verify(token, secret, { algorithms: [] });`,
          errors: [{ messageId: 'emptyAlgorithms' }],
        },
        // Sign operation with none
        {
          code: `jwt.sign(payload, secret, { algorithm: 'none' });`,
          errors: [{ messageId: 'algorithmNone' }],
        },
        // jose library
        {
          code: `jwtVerify(token, key, { algorithms: ['none'] });`,
          errors: [{ messageId: 'algorithmNoneInArray' }],
        },
        // signJWT with none
        {
          code: `signJWT(payload, key, { algorithm: 'none' });`,
          errors: [{ messageId: 'algorithmNone' }],
        },
      ],
    });
  });

  describe('Configuration Options', () => {
    ruleTester.run('config - allowInTests', noAlgorithmNone, {
      valid: [
        // Test file with allowInTests enabled
        {
          code: `jwt.verify(token, secret, { algorithm: 'none' });`,
          options: [{ allowInTests: true }],
          filename: 'auth.test.ts',
        },
        {
          code: `jwt.verify(token, secret, { algorithm: 'none' });`,
          options: [{ allowInTests: true }],
          filename: '__tests__/jwt.ts',
        },
      ],
      invalid: [
        // Non-test file with allowInTests
        {
          code: `jwt.verify(token, secret, { algorithm: 'none' });`,
          options: [{ allowInTests: true }],
          filename: 'auth.ts',
          errors: [{ messageId: 'algorithmNone' }],
        },
      ],
    });
  });
});
