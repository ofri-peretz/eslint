/**
 * Comprehensive tests for no-exposed-sensitive-data rule
 * CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noExposedSensitiveData } from '../../rules/security/no-exposed-sensitive-data';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
});

describe('no-exposed-sensitive-data', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no sensitive data exposure', noExposedSensitiveData, {
      valid: [
        // Non-sensitive logging
        {
          code: 'console.log("User logged in");',
        },
        {
          code: 'logger.info({ userId: user.id });',
        },
        {
          code: 'console.log({ message: "Processing request" });',
        },
        // Sensitive data not in logging context
        {
          code: 'const password = "secret123";',
        },
        {
          code: 'const apiKey = process.env.API_KEY;',
        },
        // Test files (when allowInTests is true)
        {
          code: 'console.log({ password: "test" });',
          filename: 'test.spec.ts',
          options: [{ allowInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - SSN Patterns', () => {
    ruleTester.run('invalid - SSN in logs', noExposedSensitiveData, {
      valid: [],
      invalid: [
        {
          code: 'console.log("User SSN: 123-45-6789");',
          errors: [
            {
              messageId: 'exposedSensitiveData',
              data: {
                issue: 'SSN pattern detected in logging/output context',
                safeAlternative: 'Remove or mask sensitive data before logging: logger.info({ userId: user.id }) instead of logger.info({ password: user.password })',
              },
              suggestions: undefined,
            },
          ],
        },
        {
          code: 'logger.info({ ssn: "123-45-6789" });',
          errors: [
            {
              messageId: 'exposedSensitiveData',
              data: {
                issue: 'SSN pattern detected in logging/output context',
                safeAlternative: 'Remove or mask sensitive data before logging: logger.info({ userId: user.id }) instead of logger.info({ password: user.password })',
              },
              suggestions: undefined,
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Credit Card Patterns', () => {
    ruleTester.run('invalid - credit card in logs', noExposedSensitiveData, {
      valid: [],
      invalid: [
        {
          code: 'console.log("Card: 1234-5678-9012-3456");',
          errors: [
            {
              messageId: 'exposedSensitiveData',
              data: {
                issue: 'Credit card pattern detected in logging/output context',
                safeAlternative: 'Remove or mask sensitive data before logging: logger.info({ userId: user.id }) instead of logger.info({ password: user.password })',
              },
              suggestions: undefined,
            },
          ],
        },
      ],
    });
  });

  describe('Invalid Code - Sensitive Keywords', () => {
    ruleTester.run('invalid - password in logs', noExposedSensitiveData, {
      valid: [],
      invalid: [
        {
          code: 'console.log({ password: user.password });',
          errors: [
            {
              messageId: 'exposedSensitiveData',
              data: {
                issue: 'Sensitive property "password" exposed in logging/output',
                safeAlternative: 'Remove or mask sensitive data: logger.info({ userId: user.id }) instead of logger.info({ password: user.password })',
              },
              suggestions: undefined,
            },
          ],
        },
        {
          code: 'logger.info({ apiKey: config.apiKey });',
          errors: [
            {
              messageId: 'exposedSensitiveData',
              data: {
                issue: 'Sensitive property "apiKey" exposed in logging/output',
                safeAlternative: 'Remove or mask sensitive data: logger.info({ userId: user.id }) instead of logger.info({ apiKey: config.apiKey })',
              },
              suggestions: undefined,
            },
          ],
        },
      ],
    });
  });
});

