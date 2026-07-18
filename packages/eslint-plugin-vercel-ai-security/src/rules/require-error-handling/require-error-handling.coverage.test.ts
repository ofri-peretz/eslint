/**
 * @fileoverview Branch-coverage tests for require-error-handling.
 * Layer 1 only — the test-file early return and the allowInTests option
 * branches are reachable via RuleTester's `filename` support.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireErrorHandling } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-error-handling (branch coverage)', requireErrorHandling, {
  valid: [
    // Test file with default options — rule disables itself entirely.
    {
      code: `async function f() { const r = await generateText({ prompt: p }); }`,
      filename: 'handler.test.ts',
    },
    // Spec-suffixed file also matches the test-file pattern.
    {
      code: `async function f() { const r = await streamText({ prompt: p }); }`,
      filename: 'handler.spec.tsx',
    },
  ],
  invalid: [
    // allowInTests: false — test filename no longer exempts the call.
    {
      code: `async function f() { const r = await generateText({ prompt: p }); }`,
      filename: 'handler.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'missingErrorHandling', data: { function: 'generateText' } }],
    },
  ],
});
