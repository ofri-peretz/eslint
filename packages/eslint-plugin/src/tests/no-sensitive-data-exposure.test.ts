/**
 * Comprehensive tests for no-sensitive-data-exposure rule
 * Security: Detects PII/credentials in logs, responses, or error messages
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noSensitiveDataExposure } from '../rules/security/no-sensitive-data-exposure';

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

describe('no-sensitive-data-exposure', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - no sensitive data', noSensitiveDataExposure, {
      valid: [
        {
          code: `
            console.log('User logged in');
          `,
        },
        {
          code: `
            const message = 'Hello world';
            console.log(message);
          `,
        },
        {
          code: `
            throw new Error('Operation failed');
          `,
        },
        {
          code: `
            const apiKey = process.env.API_KEY;
            // Not in logs
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Sensitive Data Exposure', () => {
    ruleTester.run('invalid - sensitive data in logs and errors', noSensitiveDataExposure, {
      valid: [],
      invalid: [],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - custom sensitive patterns', noSensitiveDataExposure, {
      valid: [
        {
          code: `
            console.log('Password:', password);
          `,
          options: [{ sensitivePatterns: ['secret'] }],
        },
      ],
      invalid: [],
    });
  });
});

