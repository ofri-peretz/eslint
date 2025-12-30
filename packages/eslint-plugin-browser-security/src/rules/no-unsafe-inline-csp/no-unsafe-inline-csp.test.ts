/**
 * Tests for no-unsafe-inline-csp rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeInlineCsp } from './index';
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

ruleTester.run('no-unsafe-inline-csp', noUnsafeInlineCsp, {
  valid: [
    // Safe CSP with nonce
    { code: `const csp = "script-src 'self' 'nonce-abc123'";` },
    // Safe CSP with hash
    { code: `const csp = "script-src 'self' 'sha256-xxx'";` },
    // No CSP content
    { code: `const message = "Hello world";` },
    // Test files allowed
    { code: `const csp = "script-src 'unsafe-inline'";`, filename: 'csp.test.ts' },
  ],
  invalid: [
    // String literal with unsafe-inline
    {
      code: `const csp = "script-src 'unsafe-inline'";`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // Multiple directives
    {
      code: `const csp = "default-src 'self'; script-src 'unsafe-inline' 'self'";`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // Template literal
    {
      code: `const csp = \`style-src 'unsafe-inline'\`;`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // In meta tag attribute
    {
      code: `const meta = { content: "script-src 'unsafe-inline'" };`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // Response header
    {
      code: `res.setHeader('Content-Security-Policy', "script-src 'unsafe-inline'");`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // Test file with allowInTests: false
    {
      code: `const csp = "script-src 'unsafe-inline'";`,
      filename: 'csp.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafeInline' }],
    },
  ],
});
