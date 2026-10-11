/**
 * Tests for no-timestamp-manipulation rule
 * Security: LightSEC 2025 - "Back to the Future" Attack
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noTimestampManipulation } from './index';

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

describe('no-timestamp-manipulation', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - default timestamps', noTimestampManipulation, {
      valid: [
        'const x = 42;',
        'const flag = true;',
        {
          name: 'the default timestamp behaviour',
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, {});`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h' });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { noTimestamp: false });`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret);`,
        }, // verify not checked
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    ruleTester.run('invalid - noTimestamp true', noTimestampManipulation, {
      valid: [],
      invalid: [
        {
          name: 'the flag set alongside an expiry, which does not excuse it',
          code: `import jwt from 'jsonwebtoken'; jwt.sign(payload, secret, { expiresIn: '1h', noTimestamp: true });`,
          errors: 1,
        },
        {
          name: 'noTimestamp strips the iat the receiver ages the token by',
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { noTimestamp: true });`,
          errors: [{ messageId: 'noTimestampTrue' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { algorithm: 'RS256', noTimestamp: true });`,
          errors: [{ messageId: 'noTimestampTrue' }],
        },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// FP/FN audit 2026-10
// ---------------------------------------------------------------------------
describe('no-timestamp-manipulation — audit 2026-10', () => {
  ruleTester.run(
    'ignoreExpiration and resolved options',
    noTimestampManipulation,
    {
      valid: [
        {
          name: 'ignoreExpiration: false is the default, made explicit',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'], ignoreExpiration: false });`,
        },
        {
          name: 'a passport-jwt strategy that honours expiry',
          code: `import { Strategy } from 'passport-jwt';
new Strategy({ secretOrKey: process.env.S, jwtFromRequest }, verify);`,
        },
        {
          name: 'NestJS signAsync(payload) with module options',
          code: `import { JwtService } from '@nestjs/jwt';
export const f = (svc, p) => svc.signAsync(p);`,
        },
        {
          name: 'ignoreExpiration chosen at runtime is not the literal true',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'], ignoreExpiration: flag });`,
        },
        {
          name: 'an unrelated construction',
          code: `import jwt from 'jsonwebtoken';
new Map();`,
        },
      ],
      invalid: [
        {
          name: 'FN-5: verify with ignoreExpiration: true',
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'], ignoreExpiration: true });`,
          errors: [{ messageId: 'ignoreExpiration' }],
        },
        {
          name: 'FN-5: ignoreExpiration: true inside a const options object',
          code: `import jwt from 'jsonwebtoken';
const opts = { ignoreExpiration: true };
jwt.verify(token, key, opts);`,
          errors: [{ messageId: 'ignoreExpiration' }],
        },
        {
          name: 'FN-4/FN-5: a passport-jwt strategy ignoring expiry',
          code: `import { Strategy as JwtStrategy } from 'passport-jwt';
new JwtStrategy({ secretOrKey: process.env.S, ignoreExpiration: true }, verify);`,
          errors: [{ messageId: 'ignoreExpiration' }],
        },
        {
          name: 'FP-1/FN: noTimestamp: true inside a const options object',
          code: `import jwt from 'jsonwebtoken';
const opts = { noTimestamp: true };
jwt.sign(payload, key, opts);`,
          errors: [{ messageId: 'noTimestampTrue' }],
        },
      ],
    },
  );
});

// ---------------------------------------------------------------------------
// Zero-deferral pass (audit 2026-10): an unbounded clockTolerance.
// ---------------------------------------------------------------------------
describe('no-timestamp-manipulation — maxClockToleranceSeconds', () => {
  ruleTester.run('clockTolerance ceiling', noTimestampManipulation, {
    valid: [
      {
        name: 'a 30-second clock tolerance is ordinary skew allowance',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'], clockTolerance: 30 });`,
      },
      {
        name: 'exactly the default ceiling is allowed',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'], clockTolerance: 5 * 60 });`,
      },
      {
        name: 'a raised ceiling admits a longer tolerance',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'], clockTolerance: 3600 });`,
        options: [{ maxClockToleranceSeconds: 7200 }],
      },
      {
        name: "jose's duration string is not a number of seconds",
        code: `import { jwtVerify } from 'jose';
await jwtVerify(token, key, { algorithms: ['HS256'], clockTolerance: '5 minutes' });`,
      },
      {
        name: 'a tolerance chosen at runtime is not reported',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'], clockTolerance: Number(process.env.SKEW) });`,
      },
      {
        name: 'arithmetic over a runtime value is not evaluated',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'], clockTolerance: skew * 60 });`,
      },
      {
        name: 'a non-arithmetic operator is not evaluated',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'], clockTolerance: 1 << 20 });`,
      },
    ],
    invalid: [
      {
        // @found FN-5b, harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-jwt-security.md)
        name: 'FN: a one-year clockTolerance keeps expired tokens alive',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'], clockTolerance: 60 * 60 * 24 * 365 });`,
        errors: [{ messageId: 'excessiveClockTolerance' }],
      },
      {
        // @found FN-5b, reasoned during the 2026-10-10 zero-deferral pass
        name: 'FN: an excessive clockTolerance held in a const',
        code: `import jwt from 'jsonwebtoken';
const SKEW = (3600 + 0) / 1 - 0;
jwt.verify(token, key, { algorithms: ['HS256'], clockTolerance: SKEW });`,
        errors: [{ messageId: 'excessiveClockTolerance' }],
      },
      {
        name: 'a tolerance above a lowered ceiling',
        code: `import jwt from 'jsonwebtoken';
jwt.verify(token, key, { algorithms: ['HS256'], clockTolerance: 120 });`,
        options: [{ maxClockToleranceSeconds: 60 }],
        errors: [{ messageId: 'excessiveClockTolerance' }],
      },
    ],
  });
});
