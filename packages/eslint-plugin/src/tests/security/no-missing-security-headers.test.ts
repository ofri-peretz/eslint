/**
 * Comprehensive tests for no-missing-security-headers rule
 * Security: CWE-693 - Detects missing security headers in HTTP responses
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingSecurityHeaders } from '../../rules/security/no-missing-security-headers';

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

describe('no-missing-security-headers', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - security headers set', noMissingSecurityHeaders, {
      valid: [
        // All required headers
        {
          code: `
            res.setHeader('Content-Security-Policy', 'default-src self');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-Content-Type-Options', 'nosniff');
          `,
        },
        // Test files (if ignoreInTests is true)
        {
          code: 'res.setHeader("X-Custom", "value");',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Missing Security Headers', () => {
    ruleTester.run('invalid - missing headers', noMissingSecurityHeaders, {
      valid: [],
      invalid: [
        {
          code: 'res.setHeader("X-Custom", "value");',
          errors: [{ messageId: 'missingSecurityHeader' }],
        },
        {
          code: 'res.setHeader("Content-Security-Policy", "default-src self");',
          errors: [{ messageId: 'missingSecurityHeader' }], // Missing other headers
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noMissingSecurityHeaders, {
      valid: [
        {
          code: 'res.setHeader("X-Custom", "value");',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'res.setHeader("X-Custom", "value");',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'missingSecurityHeader' }],
        },
      ],
    });

    ruleTester.run('options - requiredHeaders', noMissingSecurityHeaders, {
      valid: [
        {
          code: 'res.setHeader("Custom-Header", "value");',
          options: [{ requiredHeaders: ['Custom-Header'] }],
        },
      ],
      invalid: [
        {
          code: 'res.setHeader("Other-Header", "value");',
          options: [{ requiredHeaders: ['Custom-Header'] }],
          errors: [{ messageId: 'missingSecurityHeader' }],
        },
      ],
    });
  });
});

