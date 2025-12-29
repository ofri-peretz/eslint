/**
 * Tests for require-expiration rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireExpiration } from './index';

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

describe('require-expiration', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - with expiration', requireExpiration, {
      valid: [
        // expiresIn option
        { code: `jwt.sign(payload, secret, { expiresIn: '1h' });` },
        { code: `jwt.sign(payload, secret, { expiresIn: 3600 });` },
        // exp in payload
        { code: `jwt.sign({ sub: 'user', exp: 1234567890 }, secret);` },
        { code: `jwt.sign({ exp: Math.floor(Date.now()/1000) + 3600 }, secret);` },
        // verify not checked
        { code: `jwt.verify(token, secret);` },
        // signJWT with expiresIn
        { code: `signJWT(payload, key, { expiresIn: '1h' });` },
        // Zero arguments - edge case (line 118 coverage)
        { code: `jwt.sign();` },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - no expiration', requireExpiration, {
      valid: [],
      invalid: [
        {
          code: `jwt.sign(payload, secret);`,
          errors: [{ messageId: 'missingExpiration' }],
        },
        {
          code: `jwt.sign(payload, secret, {});`,
          errors: [{ messageId: 'missingExpiration' }],
        },
        {
          code: `jwt.sign(payload, secret, { algorithm: 'RS256' });`,
          errors: [{ messageId: 'missingExpiration' }],
        },
        {
          code: `jwt.sign({ sub: 'user', iat: Date.now() }, secret);`,
          errors: [{ messageId: 'missingExpiration' }],
        },
        {
          code: `sign(payload, key);`,
          errors: [{ messageId: 'missingExpiration' }],
        },
        // signJWT without expiration
        {
          code: `signJWT({ sub: 'user' }, key, { algorithm: 'RS256' });`,
          errors: [{ messageId: 'missingExpiration' }],
        },
      ],
    });
  });
});
