/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `fetch()` in `*.test.ts` (trpc, dogfood round 1 and 2, 2026-11-20).
 *
 * A test calls a local server or a mock, and the runner's own timeout ends a hang.
 * Reported once per fetch across a whole suite. The same call in application code
 * is still reported, so is a file that only has "test" in its name.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireNetworkTimeout } from '../../rules/reliability/require-network-timeout';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('require-network-timeout — test files', requireNetworkTimeout, {
  valid: [
    {
      name: '*.test.ts',
      filename: '/repo/src/api.test.ts',
      code: 'fetch(url)',
    },
    {
      name: '*.spec.tsx',
      filename: '/repo/src/api.spec.tsx',
      code: 'axios.get(url)',
    },
    {
      name: '*.test.mjs',
      filename: '/repo/src/api.test.mjs',
      code: 'fetch(url)',
    },
  ],
  invalid: [
    {
      name: 'control: application code',
      filename: '/repo/src/api.ts',
      code: 'fetch(url)',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'control: a name that merely contains test',
      filename: '/repo/src/latest.ts',
      code: 'fetch(url)',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'control: a test helper that is not a test file',
      filename: '/repo/src/test-client.ts',
      code: 'fetch(url)',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
