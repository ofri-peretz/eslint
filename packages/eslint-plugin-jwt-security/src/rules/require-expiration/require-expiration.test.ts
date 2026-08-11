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
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h' });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: 3600 });`,
        },
        // exp in payload
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user', exp: 1234567890 }, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ exp: Math.floor(Date.now()/1000) + 3600 }, secret);`,
        },
        // verify not checked
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret);`,
        },
        // signJWT with expiresIn
        {
          code: `import jwt from 'jsonwebtoken';
signJWT(payload, key, { expiresIn: '1h' });`,
        },
        // Zero arguments - edge case (line 118 coverage)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign();`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - no expiration', requireExpiration, {
      valid: [],
      invalid: [
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h' });`,
                },
              ],
            },
          ],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, {});`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h',});`,
                },
              ],
            },
          ],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { algorithm: 'RS256' });`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h', algorithm: 'RS256' });`,
                },
              ],
            },
          ],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user', iat: Date.now() }, secret);`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user', iat: Date.now() }, secret, { expiresIn: '1h' });`,
                },
              ],
            },
          ],
        },
        {
          code: `import jwt from 'jsonwebtoken';
sign(payload, key);`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
sign(payload, key, { expiresIn: '1h' });`,
                },
              ],
            },
          ],
        },
        // signJWT without expiration
        {
          code: `import jwt from 'jsonwebtoken';
signJWT({ sub: 'user' }, key, { algorithm: 'RS256' });`,
          errors: [
            {
              messageId: 'missingExpiration',
              suggestions: [
                {
                  messageId: 'addExpiration',
                  output: `import jwt from 'jsonwebtoken';
signJWT({ sub: 'user' }, key, { expiresIn: '1h', algorithm: 'RS256' });`,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
