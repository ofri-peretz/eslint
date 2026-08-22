/**
 * @fileoverview Tests for no-debug-code-in-production
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDebugCodeInProduction } from '../../rules/operability/no-debug-code-in-production';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-debug-code-in-production', noDebugCodeInProduction, {
  valid: [
    { code: "const mode = 'production'" },
    { code: "logger.info('message')" },
  ],

  invalid: [
    {
      code: 'if (DEBUG) { showDebug() }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'if (__DEV__) { enableTools() }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "console.log('debug')",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

/**
 * The rule's own name is the argument for this option.
 *
 * A build script is not production, so debug output in one is not debug code
 * left in production. Shares `NON_PRODUCTION_SEGMENTS` with `no-console-log`,
 * which reported many of the SAME lines under a different framing — on the
 * pinned corpus, okta-auth-js `env/index.js:22` and `scripts/verify-package.js`
 * were counted by both rules, 120 findings here and 107 there.
 */
ruleTester.run('no-debug-code-in-production — non-production paths', noDebugCodeInProduction, {
  valid: [
    { code: 'console.log("building");', filename: '/repo/scripts/build.js' },
    { code: 'const x = DEBUG;', filename: '/repo/env/index.js' },
    { code: 'if (__DEV__) { run(); }', filename: '/repo/bin/cli.js' },
    { code: 'console.log("cfg");', filename: '/repo/vite.config.ts' },
  ],
  invalid: [
    {
      // FN GUARD: application code still reports.
      code: 'const x = DEBUG;',
      filename: '/repo/src/app.ts',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      // FN GUARD: turning the option off restores the finding.
      code: 'const x = DEBUG;',
      filename: '/repo/scripts/build.js',
      options: [{ ignoreNonProductionPaths: false }],
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
