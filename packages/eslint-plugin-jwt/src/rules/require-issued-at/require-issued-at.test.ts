/**
 * Tests for require-issued-at rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireIssuedAt } from './index';

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

describe('require-issued-at', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - with iat', requireIssuedAt, {
      valid: [
        // iat in payload
        { code: `jwt.sign({ sub: 'user', iat: Date.now() }, secret);` },
        // Default behavior (jsonwebtoken adds iat automatically)
        { code: `jwt.sign(payload, secret);` },
        { code: `jwt.sign(payload, secret, { expiresIn: '1h' });` },
        // Verify not checked
        { code: `jwt.verify(token, secret);` },
        // No arguments - edge case
        { code: `sign();` },
        // Variable payload with iat
        { code: `jwt.sign({ iat: Math.floor(Date.now() / 1000), sub: 'user' }, secret);` },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - noTimestamp disables iat', requireIssuedAt, {
      valid: [],
      invalid: [
        // noTimestamp: true explicitly disables iat
        {
          code: `jwt.sign({ sub: 'user' }, secret, { noTimestamp: true });`,
          errors: [{ messageId: 'missingIssuedAt' }],
        },
        // noTimestamp with other options
        {
          code: `jwt.sign(payload, secret, { expiresIn: '1h', noTimestamp: true });`,
          errors: [{ messageId: 'missingIssuedAt' }],
        },
        // SignJWT with noTimestamp
        {
          code: `signJWT(payload, key, { noTimestamp: true });`,
          errors: [{ messageId: 'missingIssuedAt' }],
        },
      ],
    });
  });
});
