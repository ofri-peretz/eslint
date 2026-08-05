/**
 * Tests for require-issuer-validation rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireIssuerValidation } from './index';

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

describe('require-issuer-validation', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - with issuer', requireIssuerValidation, {
      valid: [
        { code: `jwt.verify(token, secret, { issuer: 'https://auth.example.com' });` },
        { code: `jwt.verify(token, secret, { iss: 'auth.example.com' });` },
        { code: `jwt.verify(token, secret, { issuer: 'auth', algorithms: ['RS256'] });` },
        { code: `jwt.sign(payload, secret);` }, // sign not checked
        // Only one argument - edge case
        { code: `jwt.verify(token);` },
        // jwtVerify with issuer
        { code: `jwtVerify(token, key, { issuer: 'https://auth.example.com' });` },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - missing issuer', requireIssuerValidation, {
      valid: [],
      invalid: [
        {
          code: `jwt.verify(token, secret);`,
          errors: [{ messageId: 'missingIssuerValidation' }],
        },
        {
          code: `jwt.verify(token, secret, {});`,
          errors: [{ messageId: 'missingIssuerValidation' }],
        },
        {
          code: `jwt.verify(token, secret, { algorithms: ['RS256'] });`,
          errors: [{ messageId: 'missingIssuerValidation' }],
        },
        // jwtVerify without issuer
        {
          code: `jwtVerify(token, key);`,
          errors: [{ messageId: 'missingIssuerValidation' }],
        },
        // jwtVerify with empty options
        {
          code: `jwtVerify(token, key, {});`,
          errors: [{ messageId: 'missingIssuerValidation' }],
        },
      ],
    });
  });
});
