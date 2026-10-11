/**
 * Tests for no-sensitive-payload rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSensitivePayload } from './index';

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

describe('no-sensitive-payload', () => {
  describe('Valid Code - Safe Payloads', () => {
    ruleTester.run('valid - standard claims', noSensitivePayload, {
      valid: [
        {
          // A dynamic method on a JWT client names nothing, so `isJwtLibraryCall`
          // cannot say this is a sign operation. The negative half of resolving
          // string subscripts: `jwt['sign']` is a sign, `jwt[m]` is not knowable.
          name: 'a dynamic method on a jwt client is not a sign operation',
          code: `import jwt from 'jsonwebtoken';\nfunction f(m) { jwt[m]({ password: 'x' }, secret); }`,
        },
        // Standard JWT claims
        {
          name: 'a subject and a role',
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user123', role: 'admin' }, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ userId: '123', permissions: [] }, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user', iss: 'auth', aud: 'api', exp: 123 }, secret);`,
        },
        // Variable reference (cannot analyze)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign(payload, secret);`,
        },
        // Verify operation (not checked)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.verify(token, secret);`,
        },
        // No arguments
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign();`,
        },
        // Non-JWT sign function
        {
          code: `import jwt from 'jsonwebtoken';
sign(payload, secret);`,
        },
        // Similar but non-sensitive names
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ passwordResetToken: false }, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ emailVerified: true }, secret);`,
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ phoneVerified: true }, secret);`,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Password Fields', () => {
    ruleTester.run('invalid - password variations', noSensitivePayload, {
      valid: [],
      invalid: [
        {
          name: 'a password inside a token anyone can base64-decode',
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ password: 'secret123' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ passwd: 'abc' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ pwd: '123' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ pass: 'xyz' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
      ],
    });
  });

  describe('Invalid Code - PII Fields', () => {
    ruleTester.run(
      'invalid - personal identifiable information',
      noSensitivePayload,
      {
        valid: [],
        invalid: [
          // Email
          {
            code: `import jwt from 'jsonwebtoken';
jwt.sign({ email: 'user@example.com' }, secret);`,
            errors: [{ messageId: 'sensitivePayloadField' }],
          },
          {
            code: `import jwt from 'jsonwebtoken';
jwt.sign({ emailAddress: 'user@test.com' }, secret);`,
            errors: [{ messageId: 'sensitivePayloadField' }],
          },
          // Phone
          {
            code: `import jwt from 'jsonwebtoken';
jwt.sign({ phone: '555-1234' }, secret);`,
            errors: [{ messageId: 'sensitivePayloadField' }],
          },
          {
            code: `import jwt from 'jsonwebtoken';
jwt.sign({ phoneNumber: '1234567890' }, secret);`,
            errors: [{ messageId: 'sensitivePayloadField' }],
          },
          // SSN
          {
            code: `import jwt from 'jsonwebtoken';
jwt.sign({ ssn: '123-45-6789' }, secret);`,
            errors: [{ messageId: 'sensitivePayloadField' }],
          },
          // Address
          {
            code: `import jwt from 'jsonwebtoken';
jwt.sign({ address: '123 Main St' }, secret);`,
            errors: [{ messageId: 'sensitivePayloadField' }],
          },
          // DOB
          {
            code: `import jwt from 'jsonwebtoken';
jwt.sign({ dob: '1990-01-01' }, secret);`,
            errors: [{ messageId: 'sensitivePayloadField' }],
          },
          {
            code: `import jwt from 'jsonwebtoken';
jwt.sign({ dateOfBirth: '1990-01-01' }, secret);`,
            errors: [{ messageId: 'sensitivePayloadField' }],
          },
        ],
      },
    );
  });

  describe('Invalid Code - Financial Fields', () => {
    ruleTester.run('invalid - financial data', noSensitivePayload, {
      valid: [],
      invalid: [
        // Credit card (camelCase)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ creditCard: '4111111111111111' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        // Credit card (snake_case)
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ credit_card: '4111111111111111' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        // Card number
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ cardNumber: '1234' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        // CVV
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ cvv: '123' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ cvc: '456' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        // PIN
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ pin: '1234' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        // Bank account
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ bankAccount: '123456' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ accountNumber: '789' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ routingNumber: '111' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
      ],
    });
  });

  describe('Invalid Code - API Keys and Secrets', () => {
    ruleTester.run('invalid - secrets and keys', noSensitivePayload, {
      valid: [],
      invalid: [
        // API key variations
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ apiKey: 'sk_live_123' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ api_key: 'sk_live_123' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        // Secret
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ secret: 'abc123' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        // Token fields
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ accessToken: 'abc123' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ refreshToken: 'xyz789' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ bearerToken: 'bearer123' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        // Private key
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ privateKey: '-----BEGIN RSA' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ secretKey: 'key123' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
      ],
    });
  });

  describe('Invalid Code - Multiple Sensitive Fields', () => {
    ruleTester.run('invalid - multiple violations', noSensitivePayload, {
      valid: [],
      invalid: [
        // Two sensitive fields - should report both
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ email: 'user@test.com', phone: '555-1234' }, secret);`,
          errors: [
            { messageId: 'sensitivePayloadField' },
            { messageId: 'sensitivePayloadField' },
          ],
        },
        // Mixed valid and invalid
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: 'user', password: 'secret' }, secret);`,
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
      ],
    });
  });

  describe('Edge Cases - Custom Configuration', () => {
    ruleTester.run('custom sensitive fields', noSensitivePayload, {
      valid: [],
      invalid: [
        // Test additionalSensitiveFields option
        {
          code: `import jwt from 'jsonwebtoken';
jwt.sign({ customSecret: 'value' }, secret);`,
          options: [{ additionalSensitiveFields: ['customsecret'] }],
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// FP/FN audit 2026-10
// ---------------------------------------------------------------------------
describe('no-sensitive-payload — audit 2026-10', () => {
  ruleTester.run('structural payload resolution', noSensitivePayload, {
    valid: [
      {
        name: 'a jose builder with harmless claims',
        code: `import { SignJWT } from 'jose';
await new SignJWT({ sub: user.id }).setProtectedHeader({ alg: 'ES256' }).sign(key);`,
      },
      {
        name: 'a payload from a parameter cannot be seen',
        code: `import jwt from 'jsonwebtoken';
export const f = (payload) => jwt.sign(payload, key);`,
      },
      {
        name: 'passwordChangedAt is a timestamp, not a password',
        code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub, passwordChangedAt: t }, key);`,
      },
    ],
    invalid: [
      {
        name: 'FN-6: the payload built in a const one statement up',
        code: `import jwt from 'jsonwebtoken';
const payload = { sub: user.id, password: user.password };
jwt.sign(payload, key);`,
        errors: [{ messageId: 'sensitivePayloadField' }],
      },
      {
        name: 'FN-6: a password hash is still sensitive',
        code: `import jwt from 'jsonwebtoken';
jwt.sign({ sub: user.id, passwordHash: user.passwordHash }, key);`,
        errors: [{ messageId: 'sensitivePayloadField' }],
      },
      {
        name: 'FN-6: a spread of a resolvable const',
        code: `import jwt from 'jsonwebtoken';
const extra = { ssn: user.ssn };
jwt.sign({ sub, ...extra }, key);`,
        errors: [{ messageId: 'sensitivePayloadField' }],
      },
      {
        name: "FN-2: jose's claims live in the SignJWT constructor",
        code: `import { SignJWT } from 'jose';
await new SignJWT({ sub: user.id, password: user.password }).setProtectedHeader({ alg: 'HS256' }).sign(key);`,
        errors: [{ messageId: 'sensitivePayloadField' }],
      },
      {
        name: 'FN-3: NestJS signAsync payload',
        code: `import { JwtService } from '@nestjs/jwt';
export const f = (svc, user) => svc.signAsync({ sub: user.id, password: user.password });`,
        errors: [{ messageId: 'sensitivePayloadField' }],
      },
    ],
  });
});

// ---------------------------------------------------------------------------
// Zero-deferral pass (audit 2026-10): a whole record spread into the claims.
// ---------------------------------------------------------------------------
describe('no-sensitive-payload — whole-record spread', () => {
  ruleTester.run('spread of an unresolvable object', noSensitivePayload, {
    valid: [
      {
        name: 'a spread of a same-file object literal with harmless claims',
        code: `import jwt from 'jsonwebtoken';
const base = { iss: 'api', aud: 'web' };
jwt.sign({ ...base, sub }, key);`,
      },
      {
        name: 'a spread of a value followed through a let and a function return',
        code: `import jwt from 'jsonwebtoken';
function claimsFor(id) { return { sub: id, scope: 'read' }; }
let claims = claimsFor(user.id);
jwt.sign({ ...claims }, key);`,
      },
      {
        name: 'a spread of a member read off a same-file object literal',
        code: `import jwt from 'jsonwebtoken';
const config = { claims: { iss: 'api' } };
jwt.sign({ ...config.claims, sub }, key);`,
      },
    ],
    invalid: [
      {
        // @found FN-6b, harness-reproduced FP/FN audit 2026-10-10 (benchmarks/audits/2026-10-10-fp-fn-jwt-security.md)
        name: 'FN: the whole user record spread into the token',
        code: `import jwt from 'jsonwebtoken';
export function issue(user) {
  return jwt.sign({ ...user }, process.env.JWT_SECRET, { expiresIn: '1h' });
}`,
        errors: [{ messageId: 'wholeRecordSpread' }],
      },
      {
        // @found FN-6b, reasoned during the 2026-10-10 zero-deferral pass
        name: 'FN: a database row spread into the token',
        code: `import jwt from 'jsonwebtoken';
export async function issue(id) {
  const row = await prisma.user.findUnique({ where: { id } });
  return jwt.sign({ ...row, role: 'user' }, key);
}`,
        errors: [{ messageId: 'wholeRecordSpread' }],
      },
      {
        name: "a call result spread into jose's claims",
        code: `import { SignJWT } from 'jose';
await new SignJWT({ ...(await loadProfile(id)) }).setProtectedHeader({ alg: 'HS256' }).sign(key);`,
        errors: [{ messageId: 'wholeRecordSpread' }],
      },
      {
        name: 'a spread of a destructured const that cannot be resolved',
        code: `import jwt from 'jsonwebtoken';
const { profile } = await getSession();
jwt.sign({ sub, ...profile }, key);`,
        errors: [{ messageId: 'wholeRecordSpread' }],
      },
    ],
  });
});
