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
          name: 'an explicit issuer',
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
          name: 'verify with no issuer accepts a token from any signer holding the key',
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

// FP/FN audit 2026-10 — see require-algorithm-whitelist for the full resolution matrix.
describe('require-issuer-validation — options resolution (audit 2026-10)', () => {
  ruleTester.run('options resolution', requireIssuerValidation, {
    valid: [
      {
        name: 'FP-1: options in a same-file const',
        code: `import jwt from 'jsonwebtoken';
const opts = { issuer: 'x' };
jwt.verify(token, key, opts);`,
      },
      {
        name: 'FP-1: options behind an as-cast',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { issuer: 'x' } as VerifyOptions);`,
      },
      {
        name: 'FP-1: a spread of a resolvable const',
        code: `import jwt from 'jsonwebtoken';
const base = { issuer: 'x' };
jwt.verify(token, key, { ...base, maxAge: '1h' });`,
      },
      {
        name: 'FP-1: an unresolvable options value stays silent',
        code: `import jwt from 'jsonwebtoken';
export const check = (token, key, opts) => jwt.verify(token, key, opts);`,
      },
      {
        name: 'FP-2: NestJS options are the second argument and merge with the module',
        code: `import { JwtService } from '@nestjs/jwt';
export const check = (jwtService, token) => jwtService.verify(token, { secret: s });`,
      },
      {
        name: 'FP-3: a node:crypto Verify object is not a JWT client',
        code: `import jwt from 'jsonwebtoken';
import { createVerify } from 'node:crypto';
const verifier = createVerify('RSA-SHA256');
verifier.verify(pub, sig, 'base64');`,
      },
    ],
    invalid: [
      {
        name: 'a const that lacks issuer still reports',
        code: `import jwt from 'jsonwebtoken';
const opts = { algorithms: ['RS256'] };
jwt.verify(token, key, opts);`,
        errors: [{ messageId: 'missingIssuerValidation' }],
      },
    ],
  });
});
