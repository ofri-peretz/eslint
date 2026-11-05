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
      // @found ecosystem fact
      name: 'FN: minify — the Vite, Rollup and esbuild spelling of the same setting',
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

// Found by the fidelity model (benchmarks/suites/fidelity/models/operability).
ruleTester.run(
  'require-code-minification — every spelling of the key',
  requireCodeMinification,
  {
    valid: [
      {
        name: 'a value the code does not prove is not a finding',
        code: 'export default (flag: boolean) => ({ build: { minify: flag } });',
      },
      {
        name: 'a tool name keeps minification on',
        code: "export default { build: { minify: 'esbuild' } };",
      },
      {
        name: 'assigning true',
        code: 'const config: any = {};\nconfig.minify = true;',
      },
      {
        name: 'a compound assignment is not a setting',
        code: 'let minify = 0;\nconst o: any = {};\no.minify += 1;\nvoid minify;',
      },
      {
        name: 'a destructuring pattern names no setting',
        code: 'const { minify = false } = opts as any;\nvoid minify;',
      },
    ],
    invalid: [
      {
        name: 'quoted key',
        code: "export default { build: { 'minify': false } };",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'static computed key',
        code: "export default { optimization: { ['minimize']: false } };",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a const bound to false',
        code: 'const OFF = false;\nexport default { build: { minify: OFF } };',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'member assignment',
        code: 'const config: any = { build: {} };\nconfig.build.minify = false;',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'subscript member assignment',
        code: "const config: any = { optimization: {} };\nconfig.optimization['minimize'] = false;",
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);
