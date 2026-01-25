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
