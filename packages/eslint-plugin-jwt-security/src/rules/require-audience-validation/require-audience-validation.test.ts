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
          name: 'an explicit audience',
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
          name: 'verify with no audience accepts a token minted for another service',
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

// FP/FN audit 2026-10 — see require-algorithm-whitelist for the full resolution matrix.
describe('require-audience-validation — options resolution (audit 2026-10)', () => {
  ruleTester.run('options resolution', requireAudienceValidation, {
    valid: [
      {
        name: 'FP-1: options in a same-file const',
        code: `import jwt from 'jsonwebtoken';
const opts = { audience: 'x' };
jwt.verify(token, key, opts);`,
      },
      {
        name: 'FP-1: options behind an as-cast',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { audience: 'x' } as VerifyOptions);`,
      },
      {
        name: 'FP-1: a spread of a resolvable const',
        code: `import jwt from 'jsonwebtoken';
const base = { audience: 'x' };
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
        name: 'a const that lacks audience still reports',
        code: `import jwt from 'jsonwebtoken';
const opts = { algorithms: ['RS256'] };
jwt.verify(token, key, opts);`,
        errors: [{ messageId: 'missingAudienceValidation' }],
      },
    ],
  });
});
