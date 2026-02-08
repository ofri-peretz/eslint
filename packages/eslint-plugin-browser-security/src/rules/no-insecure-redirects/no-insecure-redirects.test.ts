/**
 * Comprehensive tests for no-insecure-redirects rule
 * Security: CWE-601 - Detects open redirect vulnerabilities
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureRedirects } from './index';

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

describe('no-insecure-redirects', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - validated redirects', noInsecureRedirects, {
      valid: [
        // Relative redirects
        { code: 'res.redirect("/dashboard");' },
        { code: 'res.redirect("../home");' },
        // Test files (if ignoreInTests is true)
        {
          code: 'res.redirect(req.query.url);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
        // Validated with validateUrl
        {
          code: `
            const url = req.query.url;
            validateUrl(url);
            res.redirect(url);
          `,
        },
        // Validated with isValidUrl
        {
          code: `
            const redirect = req.query.redirect;
            if (isValidUrl(redirect)) {
              res.redirect(redirect);
            }
          `,
        },
        // Validated with allowedDomains check
        {
          code: `
            const target = req.body.target;
            if (allowedDomains.includes(target)) {
              res.redirect(target);
            }
          `,
        },
        // Validated with startsWith check
        {
          code: `
            const url = req.params.url;
            url.startsWith('https://');
            res.redirect(url);
          `,
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Insecure Redirects', () => {
    ruleTester.run('invalid - unvalidated redirects', noInsecureRedirects, {
      valid: [],
      invalid: [
        { code: 'res.redirect(req.query.url);', errors: [{ messageId: 'insecureRedirect' }] },
        { code: 'res.redirect(req.body.redirectUrl);', errors: [{ messageId: 'insecureRedirect' }] },
        { code: 'window.location.href = req.params.url;', errors: [{ messageId: 'insecureRedirect' }] },
        // Using location.replace
        { code: 'location.replace(req.query.url);', errors: [{ messageId: 'insecureRedirect' }] },
        { code: 'location.assign(req.body.next);', errors: [{ messageId: 'insecureRedirect' }] },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noInsecureRedirects, {
      valid: [
        {
          code: 'res.redirect(req.query.url);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'res.redirect(req.query.url);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'insecureRedirect' }],
        },
      ],
    });
  });
  describe('Benchmark FP/FN Regression', () => {
    ruleTester.run('benchmark regression', noInsecureRedirects, {
      valid: [
        // safe_redirect_allowlist — redirect guarded by allowlist .includes() check
        {
          code: `
            const ALLOWED_REDIRECTS = ["/dashboard", "/profile", "/settings"];
            const target = req.query.returnTo;
            if (!ALLOWED_REDIRECTS.includes(target)) {
              return res.redirect("/");
            }
            res.redirect(target);
          `,
        },
      ],
      invalid: [
        // vuln_redirect — open redirect via variable assignment from req.query
        {
          code: `
            const returnUrl = req.query.returnTo;
            res.redirect(returnUrl);
          `,
          errors: [{ messageId: 'insecureRedirect' }],
        },
      ],
    });
  });
});
