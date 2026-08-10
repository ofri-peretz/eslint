/**
 * Tests for require-audience-validation rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireAudienceValidation } from './index';

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

describe('require-audience-validation', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - with audience', requireAudienceValidation, {
      valid: [
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { audience: 'https://api.example.com' });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { aud: 'api.example.com' });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { audience: ['api', 'web'] });`,
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
        // jwtVerify with audience
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key, { audience: 'https://api.example.com' });`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - missing audience', requireAudienceValidation, {
      valid: [],
      invalid: [
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret);`,
          errors: [{ messageId: 'missingAudienceValidation' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, {});`,
          errors: [{ messageId: 'missingAudienceValidation' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { issuer: 'auth.example.com' });`,
          errors: [{ messageId: 'missingAudienceValidation' }],
        },
        // jwtVerify without audience
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key);`,
          errors: [{ messageId: 'missingAudienceValidation' }],
        },
        // jwtVerify with only issuer
        {
          code: `import jwt from 'jsonwebtoken';
jwtVerify(token, key, { issuer: 'auth.example.com' });`,
          errors: [{ messageId: 'missingAudienceValidation' }],
        },
      ],
    });
  });
});
