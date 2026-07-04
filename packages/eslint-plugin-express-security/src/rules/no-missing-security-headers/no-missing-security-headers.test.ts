/**
 * Comprehensive tests for no-missing-security-headers rule
 * Security: CWE-693 - Detects missing security headers in HTTP responses
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noMissingSecurityHeaders } from './index';

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


// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run('no-missing-security-headers (coverage wave)', noMissingSecurityHeaders, {
  valid: [
    // bare call — callee is not a member expression
    { code: `setHeader('X-Frame-Options', 'DENY');` },
    // member method that is not a header setter
    { code: `res.json({ ok: true });` },
    // all required headers set inside a function scope — checked, no report
    {
      code: `
        function handler(req, res) {
          res.setHeader('Content-Security-Policy', "default-src 'self'");
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }
      `,
    },
  ],
  invalid: [
    // res.set() without arguments — header name is unknown, all headers missing
    { code: `res.set();`, errors: [{ messageId: 'missingSecurityHeader' }] },
    // dynamic header name cannot be tracked
    {
      code: `res.setHeader(headerName, 'value');`,
      errors: [{ messageId: 'missingSecurityHeader' }],
    },
    // function declaration scope with only one of the required headers
    {
      code: `
        function handler(req, res) {
          res.setHeader('X-Frame-Options', 'DENY');
        }
      `,
      errors: [{ messageId: 'missingSecurityHeader' }],
    },
    // function expression scope
    {
      code: `app.get('/a', function (req, res) { res.setHeader('X-Frame-Options', 'DENY'); });`,
      errors: [{ messageId: 'missingSecurityHeader' }],
    },
    // arrow function scope
    {
      code: `app.get('/a', (req, res) => { res.setHeader('X-Frame-Options', 'DENY'); });`,
      errors: [{ messageId: 'missingSecurityHeader' }],
    },
  ],
});
