import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDebugModeProduction } from '../no-debug-mode-production/index';

const ruleTester = new RuleTester();

ruleTester.run('no-debug-mode-production', noDebugModeProduction, {
  valid: [
    // Debug set to false
    `mongoose.set('debug', false);`,
    // Debug based on env check
    `mongoose.set('debug', process.env.NODE_ENV !== 'production');`,
    // Different option
    `mongoose.set('strict', true);`,
    // Not a set() call
    `mongoose.connect(uri);`,
    // Test file (allowed by default)
    {
      code: `mongoose.set('debug', true);`,
      filename: 'setup.test.ts',
    },
  ],

  invalid: [
    // mongoose.set('debug', true)
    {
      code: `mongoose.set('debug', true);`,
      errors: [{ messageId: 'debugModeProduction' }],
    },
    // Any object.set('debug', true)
    {
      code: `db.set('debug', true);`,
      errors: [{ messageId: 'debugModeProduction' }],
    },
    // config.set('debug', true) - also flags since any .set('debug', true) is risky
    {
      code: `config.set('debug', true);`,
      errors: [{ messageId: 'debugModeProduction' }],
    },
    // allowInTests: false
    {
      code: `mongoose.set('debug', true);`,
      filename: 'setup.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'debugModeProduction' }],
    },
  ],
});
