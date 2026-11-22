/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * `console.log` in `*.test.ts` (trpc `next-app-dir.test.ts:68`, dogfood round 2,
 * 2026-11-20): reported by BOTH `no-console-log` and `no-debug-code-in-production`,
 * on the same line, in a file that never ships.
 *
 * Both rules take `ignoreNonProductionPaths` (default true). A file named as a test
 * is non-production by its own name. Application code is still reported by both, and
 * turning the option off brings the test file back.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noConsoleLog } from '../../rules/operability/no-console-log';
import { noDebugCodeInProduction } from '../../rules/operability/no-debug-code-in-production';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-console-log — test files', noConsoleLog, {
  valid: [
    {
      name: '*.test.ts',
      filename: '/repo/src/next-app-dir.test.ts',
      code: "console.log('step');",
    },
    {
      name: '*.spec.mjs',
      filename: '/repo/src/a.spec.mjs',
      code: "console.log('step');",
    },
  ],
  invalid: [
    {
      name: 'control: application code',
      filename: '/repo/src/server.ts',
      code: "console.log('step');",
      output: '',
      errors: [{ messageId: 'consoleLogFound' }],
    },
    {
      name: 'control: opting out of the non-production list brings the test file back',
      filename: '/repo/src/next-app-dir.test.ts',
      options: [{ ignoreNonProductionPaths: false }],
      code: "console.log('step');",
      output: '',
      errors: [{ messageId: 'consoleLogFound' }],
    },
  ],
});

ruleTester.run(
  'no-debug-code-in-production — test files',
  noDebugCodeInProduction,
  {
    valid: [
      {
        name: '*.test.ts',
        filename: '/repo/src/next-app-dir.test.ts',
        code: "console.log('step');",
      },
    ],
    invalid: [
      {
        name: 'control: application code',
        filename: '/repo/src/server.ts',
        code: "console.log('step');",
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);
