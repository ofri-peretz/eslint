/**
 * Tests for require-algorithm-whitelist rule
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
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('require-algorithm-whitelist', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - with algorithms', requireAlgorithmWhitelist, {
      valid: [
        { code: `jwt.verify(token, secret, { algorithms: ['RS256'] });` },
        { code: `jwt.verify(token, secret, { algorithms: ['RS256', 'ES256'] });` },
        { code: `jwt.verify(token, secret, { algorithm: 'RS256' });` },
        { code: `jwt.verify(token, secret, { alg: 'RS256' });` },
        { code: `jwt.sign(payload, secret);` }, // sign not checked
        // Only one argument - edge case
        { code: `jwt.verify(token);` },
        // jwtVerify with algorithms
        { code: `jwtVerify(token, key, { algorithms: ['RS256'] });` },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - no algorithms', requireAlgorithmWhitelist, {
      valid: [],
      invalid: [
        {
          code: `jwt.verify(token, secret);`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          code: `jwt.verify(token, secret, {});`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          code: `jwt.verify(token, secret, { complete: true });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          code: `jwt.verify(token, secret, { issuer: 'auth.example.com' });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        {
          code: `jwtVerify(token, key);`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
        // verifyJWT without algorithms
        {
          code: `verifyJWT(token, key, { issuer: 'auth.example.com' });`,
          errors: [{ messageId: 'missingAlgorithmWhitelist' }],
        },
      ],
    });
  });
});
