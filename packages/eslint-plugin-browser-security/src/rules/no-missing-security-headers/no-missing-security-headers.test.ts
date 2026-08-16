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


/**
 * Regression lock — CSP / X-Frame-Options / X-Content-Type-Options protect a RENDERED
 * DOCUMENT. A scope whose only headers are transport or caching concerns has no document to
 * frame or inject into, so demanding them there is noise: the rule fired on a plain
 * `res.setHeader('Set-Cookie', …)` helper that renders nothing.
 *
 * Deliberately narrow. An EARLIER attempt required proof of a `res.send`/`render` call in
 * scope and broke 9 tests — a RuleTester snippet sets a header without sending anything
 * because the snippet is truncated, not because the handler serves no document.
 */
ruleTester.run('lock: transport-only headers are not a document response', noMissingSecurityHeaders, {
  valid: [
    { code: "function setSession(res, id) { res.setHeader('Set-Cookie', 'sid=' + id); }" },
    { code: "function noStore(res) { res.setHeader('Cache-Control', 'no-store'); }" },
    { code: "function redirect(res, to) { res.setHeader('Location', to); }" },
  ],
  invalid: [
    // A security header in the mix means this IS a document response — the others are missing.
    { code: "function h(res) { res.setHeader('X-Frame-Options', 'DENY'); }", errors: 1 },
  ],
});

/**
 * Regression lock — `set` is a method name, not evidence of an HTTP response.
 *
 * `set` sat in the trigger list beside `setHeader` and `header`, so the rule
 * reported `featureFlags.set('newCheckout', true)` as "Missing security
 * headers: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options"
 * at CVSS 7.5. It now needs the first argument to name a header it knows.
 */
ruleTester.run('lock: .set() must name a header', noMissingSecurityHeaders, {
  valid: [
    // The reported false positive, and its neighbours.
    { code: "featureFlags.set('newCheckout', true);" },
    { code: "const cache = new Map(); cache.set('user:42', profile);" },
    { code: "formData.set('email', 'a@b.test');" },
    { code: "store.set('theme', 'dark');" },
    // A dynamic key proves nothing either way, so the rule abstains.
    { code: 'res.set(headerName, headerValue);' },
    // A `set` on a document header alongside the rest of the trio is fine.
    {
      code: `
        res.set('Content-Security-Policy', "default-src 'self'");
        res.set('X-Frame-Options', 'DENY');
        res.set('X-Content-Type-Options', 'nosniff');
      `,
    },
    // Express's own header alias, same trio.
    {
      code: `
        res.header('Content-Security-Policy', "default-src 'self'");
        res.header('X-Frame-Options', 'DENY');
        res.header('X-Content-Type-Options', 'nosniff');
      `,
    },
  ],
  invalid: [
    // `res.set` with a real header name still triggers the rule.
    { code: "res.set('Content-Type', 'text/html');", errors: 1 },
    { code: "res.set('X-Frame-Options', 'DENY');", errors: 1 },
    { code: "res.header('Content-Type', 'text/html');", errors: 1 },
    // A header the closed list has never heard of is still recognised when the
    // project configured it via requiredHeaders.
    {
      code: "res.set('X-Tenant-Policy', 'strict');",
      options: [{ requiredHeaders: ['X-Tenant-Policy', 'X-Frame-Options'] }],
      errors: 1,
    },
  ],
});
