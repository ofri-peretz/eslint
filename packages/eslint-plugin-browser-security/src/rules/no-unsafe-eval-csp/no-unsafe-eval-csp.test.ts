/**
 * Tests for no-unsafe-eval-csp rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeEvalCsp } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-unsafe-eval-csp', noUnsafeEvalCsp, {
  valid: [
    // Safe CSP without unsafe-eval
    { code: `const csp = "script-src 'self'";` },
    // With nonce
    { code: `const csp = "script-src 'self' 'nonce-abc123'";` },
    // No CSP content
    { code: `const message = "Some text";` },
    // Test files allowed
    { code: `const csp = "script-src 'unsafe-eval'";`, filename: 'csp.test.ts' },
  ],
  invalid: [
    // String literal with unsafe-eval
    {
      code: `const csp = "script-src 'unsafe-eval'";`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // Multiple directives
    {
      code: `const csp = "default-src 'self'; script-src 'unsafe-eval' 'self'";`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // Template literal
    {
      code: `const csp = \`script-src 'unsafe-eval'\`;`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // Combined with unsafe-inline
    {
      code: `const csp = "script-src 'unsafe-inline' 'unsafe-eval'";`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // Response header
    {
      code: `res.setHeader('Content-Security-Policy', "script-src 'unsafe-eval'");`,
      errors: [{ messageId: 'unsafeEval' }],
    },
    // Test file with allowInTests: false
    {
      code: `const csp = "script-src 'unsafe-eval'";`,
      filename: 'csp.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafeEval' }],
    },
  ],
});
