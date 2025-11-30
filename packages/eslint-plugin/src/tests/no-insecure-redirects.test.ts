/**
 * Comprehensive tests for no-insecure-redirects rule
 * Security: CWE-601 - Detects open redirect vulnerabilities
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureRedirects } from '../rules/security/no-insecure-redirects';

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
        {
          code: 'res.redirect("/dashboard");',
        },
        {
          code: 'res.redirect("../home");',
        },
        // Test files (if ignoreInTests is true)
        {
          code: 'res.redirect(req.query.url);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [],
    });
  });

  describe('Invalid Code - Insecure Redirects', () => {
    ruleTester.run('invalid - unvalidated redirects', noInsecureRedirects, {
      valid: [],
      invalid: [
        {
          code: 'res.redirect(req.query.url);',
          errors: [{ messageId: 'insecureRedirect' }],
        },
        {
          code: 'res.redirect(req.body.redirectUrl);',
          errors: [{ messageId: 'insecureRedirect' }],
        },
        {
          code: 'window.location.href = req.params.url;',
          errors: [{ messageId: 'insecureRedirect' }],
        },
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
});

