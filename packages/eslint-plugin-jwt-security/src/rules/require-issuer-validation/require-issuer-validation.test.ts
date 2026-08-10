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
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { issuer: 'https://auth.example.com' });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { iss: 'auth.example.com' });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { issuer: 'auth', algorithms: ['RS256'] });`,
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
        // jwtVerify with issuer
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key, { issuer: 'https://auth.example.com' });`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - missing issuer', requireIssuerValidation, {
      valid: [],
      invalid: [
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret);`,
          errors: [{ messageId: 'missingIssuerValidation' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, {});`,
          errors: [{ messageId: 'missingIssuerValidation' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { algorithms: ['RS256'] });`,
          errors: [{ messageId: 'missingIssuerValidation' }],
        },
        // jwtVerify without issuer
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key);`,
          errors: [{ messageId: 'missingIssuerValidation' }],
        },
        // jwtVerify with empty options
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key, {});`,
          errors: [{ messageId: 'missingIssuerValidation' }],
        },
      ],
    });
  });
});
