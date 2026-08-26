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
    {
      name: 'a spelling the consumer removed stops reporting',
      code: 'const config = { minimize: false }',
      options: [{ minificationKeys: ['minify'] }],
    },
    // Minification enabled
    { name: 'minimize turned on', code: 'const config = { minimize: true }' },
    { code: 'module.exports = { optimization: { minimize: true } }' },
    // Non-minification config
    { code: 'const x = 1' },
    { code: 'const config = { debug: false }' },
  ],

  invalid: [
    {
      name: 'minify — the Vite, Rollup and esbuild spelling of the same setting',
      code: 'export default { build: { minify: false } }',
      errors: 1,
    },
    {
      name: 'a spelling the consumer named themselves',
      code: 'export default { compress: false }',
      options: [{ minificationKeys: ['compress'] }],
      errors: 1,
    },
    {
      name: 'minimize turned off inside a webpack optimization block',
      code: 'module.exports = { optimization: { minimize: false, usedExports: true } }',
      errors: 1,
    },
    // Minification disabled
    {
      name: 'minimize turned off ships readable source',
      code: 'const config = { minimize: false }',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'module.exports = { optimization: { minimize: false } }',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
