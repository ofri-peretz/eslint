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
          name: 'an explicit maxAge',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { maxAge: '1h' });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { maxAge: 3600 });`,
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
          name: 'verify with no maxAge trusts whatever expiry the token carries',
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
        {
          // FN-7 (audit 2026-10). This case used to be VALID. `clockTolerance`
          // WIDENS the exp/nbf window — it is the opposite of a maximum token
          // age — so accepting it as one certified a verify that caps nothing.
          name: 'FN-7: clockTolerance is not a max age',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret, { clockTolerance: 30 });`,
          errors: [{ messageId: 'missingMaxAge' }],
        },
      ],
    });
  });
});

// FP/FN audit 2026-10.
describe('require-max-age — audit 2026-10', () => {
  ruleTester.run('jose spelling and options resolution', requireMaxAge, {
    valid: [
      {
        name: 'FP-10: jose spells it maxTokenAge',
        code: `import { jwtVerify } from 'jose';
await jwtVerify(token, JWKS, { algorithms: ['RS256'], maxTokenAge: '15m' });`,
      },
      {
        name: 'FP-1: options in a same-file const',
        code: `import jwt from 'jsonwebtoken';
const opts = { maxAge: '1h' };
jwt.verify(token, key, opts);`,
      },
      {
        name: 'FP-1: an unresolvable options value stays silent',
        code: `import jwt from 'jsonwebtoken';
export const check = (token, key, opts) => jwt.verify(token, key, opts);`,
      },
      {
        name: 'FP-2: NestJS options merge over module verifyOptions',
        code: `import { JwtService } from '@nestjs/jwt';
export const check = (svc, token) => svc.verify(token, { secret: s });`,
      },
    ],
    invalid: [
      {
        name: 'a spread of a const that lacks maxAge still reports',
        code: `import jwt from 'jsonwebtoken';
const base = { algorithms: ['RS256'] };
jwt.verify(token, key, { ...base });`,
        errors: [{ messageId: 'missingMaxAge' }],
      },
    ],
  });
});
