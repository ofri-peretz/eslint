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
