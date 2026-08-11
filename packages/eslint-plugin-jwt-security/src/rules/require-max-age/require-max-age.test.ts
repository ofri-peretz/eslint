/**
 * Tests for require-max-age rule
 * Security: LightSEC 2025 - Replay Attack Prevention
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireMaxAge } from './index';

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

describe('require-max-age', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - with maxAge', requireMaxAge, {
      valid: [
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { maxAge: '1h' });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { maxAge: 3600 });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { clockTolerance: 30 });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
        }, // sign not checked
        // Only one argument - edge case
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token);`,
        },
        // jwtVerify with maxAge
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key, { maxAge: '24h' });`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - missing maxAge', requireMaxAge, {
      valid: [],
      invalid: [
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret);`,
          errors: [{ messageId: 'missingMaxAge' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, {});`,
          errors: [{ messageId: 'missingMaxAge' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithms: ['RS256'] });`,
          errors: [{ messageId: 'missingMaxAge' }],
        },
        // jwtVerify without maxAge
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key);`,
          errors: [{ messageId: 'missingMaxAge' }],
        },
        // verifyJWT without maxAge
        {
          code: `import jwt from 'jsonwebtoken';
verifyJWT(token, key, { algorithms: ['RS256'] });`,
          errors: [{ messageId: 'missingMaxAge' }],
        },
      ],
    });
  });
});
