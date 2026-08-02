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

// ---------------------------------------------------------------------------
// Regression lock: `.set()` / `.header()` on a non-response receiver is not a
// header call. Matching on the method name alone flagged every url
// .searchParams.set() and app.set('view engine', …) in the codebase.
// ---------------------------------------------------------------------------
ruleTester.run('no-missing-security-headers (callee must be a response)', noMissingSecurityHeaders, {
  valid: [
    // the reported false positives
    { code: `url.searchParams.set('page', '2');` },
    { code: `app.set('view engine', 'ejs');` },
    { code: `app.set('trust proxy', 1);` },
    // other everyday .set()/.header() receivers
    { code: `cache.set('Content-Security-Policy', 'value');` },
    { code: `headers.set('X-Frame-Options', 'DENY');` },
    { code: `formData.set('X-Content-Type-Options', 'nosniff');` },
    // computed member access is not tracked
    { code: `res[method]('X-Frame-Options', 'DENY');` },
    { code: `ctx['res'].set('X-Frame-Options', 'DENY');` },
    // call-expression receiver is not tracked
    { code: `getResponse().set('X-Frame-Options', 'DENY');` },
    // a real response receiver with every required header still passes
    {
      code: `
        function handler(req, res) {
          ctx.res.set('Content-Security-Policy', "default-src 'self'");
          ctx.res.set('X-Frame-Options', 'DENY');
          ctx.res.set('X-Content-Type-Options', 'nosniff');
        }
      `,
    },
    // a non-header header name collected from a non-response receiver must not
    // satisfy the requirement — no response call here at all, so no report
    { code: `myMap.set('Content-Security-Policy', 'x');` },
  ],
  invalid: [
    // response aliases are still checked
    {
      code: `reply.header('X-Frame-Options', 'DENY');`,
      errors: [{ messageId: 'missingSecurityHeader' }],
    },
    {
      code: `response.set('X-Frame-Options', 'DENY');`,
      errors: [{ messageId: 'missingSecurityHeader' }],
    },
    {
      code: `ctx.res.set('X-Frame-Options', 'DENY');`,
      errors: [{ messageId: 'missingSecurityHeader' }],
    },
    // a non-response .set() cannot satisfy a required header for a real
    // response call in the same scope
    {
      code: `
        function handler(req, res) {
          url.searchParams.set('Content-Security-Policy', "default-src 'self'");
          res.set('X-Frame-Options', 'DENY');
          res.set('X-Content-Type-Options', 'nosniff');
        }
      `,
      errors: [{ messageId: 'missingSecurityHeader' }],
    },
  ],
});
