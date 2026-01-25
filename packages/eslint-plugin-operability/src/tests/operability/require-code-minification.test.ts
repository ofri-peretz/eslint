/**
 * @fileoverview Tests for require-code-minification
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireCodeMinification } from '../../rules/operability/require-code-minification';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-code-minification', requireCodeMinification, {
  valid: [
    // Minification enabled
    { code: 'const config = { minimize: true }' },
    { code: 'module.exports = { optimization: { minimize: true } }' },
    // Non-minification config
    { code: 'const x = 1' },
    { code: 'const config = { debug: false }' },
  ],

  invalid: [
    // Minification disabled
    {
      code: 'const config = { minimize: false }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'module.exports = { optimization: { minimize: false } }',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
