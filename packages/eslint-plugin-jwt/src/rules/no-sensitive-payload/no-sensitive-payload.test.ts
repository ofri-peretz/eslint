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
        // Standard JWT claims
        { code: `jwt.sign({ sub: 'user123', role: 'admin' }, secret);` },
        { code: `jwt.sign({ userId: '123', permissions: [] }, secret);` },
        { code: `jwt.sign({ sub: 'user', iss: 'auth', aud: 'api', exp: 123 }, secret);` },
        // Variable reference (cannot analyze)
        { code: `jwt.sign(payload, secret);` },
        // Verify operation (not checked)
        { code: `jwt.verify(token, secret);` },
        // No arguments
        { code: `jwt.sign();` },
        // Non-JWT sign function
        { code: `sign(payload, secret);` },
        // Similar but non-sensitive names
        { code: `jwt.sign({ passwordResetToken: false }, secret);` },
        { code: `jwt.sign({ emailVerified: true }, secret);` },
        { code: `jwt.sign({ phoneVerified: true }, secret);` },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Password Fields', () => {
    ruleTester.run('invalid - password variations', noSensitivePayload, {
      valid: [],
      invalid: [
        { code: `jwt.sign({ password: 'secret123' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ passwd: 'abc' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ pwd: '123' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ pass: 'xyz' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
      ],
    });
  });

  describe('Invalid Code - PII Fields', () => {
    ruleTester.run('invalid - personal identifiable information', noSensitivePayload, {
      valid: [],
      invalid: [
        // Email
        { code: `jwt.sign({ email: 'user@example.com' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ emailAddress: 'user@test.com' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        // Phone
        { code: `jwt.sign({ phone: '555-1234' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ phoneNumber: '1234567890' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        // SSN
        { code: `jwt.sign({ ssn: '123-45-6789' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        // Address
        { code: `jwt.sign({ address: '123 Main St' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        // DOB
        { code: `jwt.sign({ dob: '1990-01-01' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ dateOfBirth: '1990-01-01' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
      ],
    });
  });

  describe('Invalid Code - Financial Fields', () => {
    ruleTester.run('invalid - financial data', noSensitivePayload, {
      valid: [],
      invalid: [
        // Credit card (camelCase)
        { code: `jwt.sign({ creditCard: '4111111111111111' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        // Credit card (snake_case)
        { code: `jwt.sign({ credit_card: '4111111111111111' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        // Card number
        { code: `jwt.sign({ cardNumber: '1234' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        // CVV
        { code: `jwt.sign({ cvv: '123' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ cvc: '456' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        // PIN
        { code: `jwt.sign({ pin: '1234' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        // Bank account
        { code: `jwt.sign({ bankAccount: '123456' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ accountNumber: '789' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ routingNumber: '111' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
      ],
    });
  });

  describe('Invalid Code - API Keys and Secrets', () => {
    ruleTester.run('invalid - secrets and keys', noSensitivePayload, {
      valid: [],
      invalid: [
        // API key variations
        { code: `jwt.sign({ apiKey: 'sk_live_123' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ api_key: 'sk_live_123' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        // Secret
        { code: `jwt.sign({ secret: 'abc123' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        // Token fields
        { code: `jwt.sign({ accessToken: 'abc123' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ refreshToken: 'xyz789' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ bearerToken: 'bearer123' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        // Private key
        { code: `jwt.sign({ privateKey: '-----BEGIN RSA' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
        { code: `jwt.sign({ secretKey: 'key123' }, secret);`, errors: [{ messageId: 'sensitivePayloadField' }] },
      ],
    });
  });

  describe('Invalid Code - Multiple Sensitive Fields', () => {
    ruleTester.run('invalid - multiple violations', noSensitivePayload, {
      valid: [],
      invalid: [
        // Two sensitive fields - should report both
        {
          code: `jwt.sign({ email: 'user@test.com', phone: '555-1234' }, secret);`,
          errors: [
            { messageId: 'sensitivePayloadField' },
            { messageId: 'sensitivePayloadField' },
          ],
        },
        // Mixed valid and invalid
        {
          code: `jwt.sign({ sub: 'user', password: 'secret' }, secret);`,
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
          code: `jwt.sign({ customSecret: 'value' }, secret);`,
          options: [{ additionalSensitiveFields: ['customsecret'] }],
          errors: [{ messageId: 'sensitivePayloadField' }],
        },
      ],
    });
  });
});
