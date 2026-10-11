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
        {
          name: 'an explicit iat',
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user', iat: Date.now() }, secret);`,
        },
        // Default behavior (jsonwebtoken adds iat automatically)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h' });`,
        },
        // Verify not checked
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret);`,
        },
        // No arguments - edge case
        {
          code: `import jwt from 'jsonwebtoken';
sign();`,
        },
        // Variable payload with iat
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ iat: Math.floor(Date.now() / 1000), sub: 'user' }, secret);`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code', () => {
    /*
     * Audit 2026-10 (zero-deferral pass, owner decision on FP-11b): these
     * three cases used to be INVALID. `noTimestamp: true` is reported by
     * `no-timestamp-manipulation` (recommended) at the same node, so this rule
     * reporting it too was one defect, two findings. The literal `true` now
     * belongs to that rule alone; this rule keeps the cases it alone can see —
     * a `noTimestamp` chosen at runtime, and a jose builder that never sets iat.
     */
    ruleTester.run(
      'flipped - noTimestamp: true is owned by no-timestamp-manipulation',
      requireIssuedAt,
      {
        valid: [
          {
            // @found FP-11b, harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-jwt-security.md)
            name: 'FP: noTimestamp: true is reported once, by no-timestamp-manipulation',
            code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user' }, secret, { noTimestamp: true });`,
          },
          {
            name: 'noTimestamp: true beside other options is not double-reported',
            code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { expiresIn: '1h', noTimestamp: true });`,
          },
          {
            name: 'signJWT with noTimestamp: true is not double-reported',
            code: `import jwt from 'jsonwebtoken';
signJWT(payload, key, { noTimestamp: true });`,
          },
        ],
        invalid: [
          {
            name: 'a noTimestamp chosen at runtime may strip iat',
            code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret, { noTimestamp: process.env.LEGACY === '1' });`,
            errors: [{ messageId: 'missingIssuedAt' }],
          },
        ],
      },
    );
  });
});

// ---------------------------------------------------------------------------
// FP/FN audit 2026-10
// ---------------------------------------------------------------------------
describe('require-issued-at — audit 2026-10', () => {
  ruleTester.run('noTimestamp false and jose', requireIssuedAt, {
    valid: [
      {
        name: 'FP-11: noTimestamp: false KEEPS iat',
        code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub }, key, { expiresIn: '1h', noTimestamp: false });`,
      },
      {
        name: 'FN-9: a jose builder that calls setIssuedAt()',
        code: `import { SignJWT } from 'jose';
await new SignJWT({ sub }).setProtectedHeader({ alg: 'ES256' }).setIssuedAt().setExpirationTime('1h').sign(key);`,
      },
      {
        name: 'FN-9: a jose builder whose claims carry iat',
        code: `import { SignJWT } from 'jose';
await new SignJWT({ sub, iat: now }).setProtectedHeader({ alg: 'ES256' }).sign(key);`,
      },
      {
        name: 'FN-9: a jose builder in a const that sets iat in its own statement',
        code: `import { SignJWT } from 'jose';
const b = new SignJWT({ sub });
b.setIssuedAt();
await b.sign(key);`,
      },
      {
        name: 'FN-9: claims that cannot be seen may carry iat',
        code: `import { SignJWT } from 'jose';
export const f = (claims, key) => new SignJWT(claims).sign(key);`,
      },
      {
        name: 'a JWS builder carries no claim set',
        code: `import { CompactSign } from 'jose';
await new CompactSign(bytes).setProtectedHeader({ alg: 'ES256' }).sign(key);`,
      },
    ],
    invalid: [
      {
        name: 'FN-9: jose does not add iat unless setIssuedAt() is called',
        code: `import { SignJWT } from 'jose';
await new SignJWT({ sub }).setProtectedHeader({ alg: 'ES256' }).setExpirationTime('1h').sign(key);`,
        errors: [{ messageId: 'missingIssuedAt' }],
      },
      {
        name: 'FN-9: a jose builder with no claims at all',
        code: `import { SignJWT } from 'jose';
await new SignJWT().sign(key);`,
        errors: [{ messageId: 'missingIssuedAt' }],
      },
      {
        name: 'noTimestamp chosen at runtime may drop iat',
        code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub }, key, { noTimestamp: legacy });`,
        errors: [{ messageId: 'missingIssuedAt' }],
      },
    ],
  });
});
