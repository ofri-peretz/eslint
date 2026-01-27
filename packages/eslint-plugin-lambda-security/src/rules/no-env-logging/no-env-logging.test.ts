import { RuleTester } from '@typescript-eslint/rule-tester';
import { noEnvLogging } from './index';

const ruleTester = new RuleTester();

ruleTester.run('no-env-logging', noEnvLogging, {
  valid: [
    // ========== VALID: Logging specific env vars ==========
    {
      code: `console.log('Region:', process.env.AWS_REGION);`,
    },
    {
      code: `console.log('Node env:', process.env.NODE_ENV);`,
    },
    {
      code: `logger.info({ region: process.env.AWS_REGION });`,
    },
    // ========== VALID: No process.env in logs ==========
    {
      code: `console.log('Hello world');`,
    },
    {
      code: `console.log(userId, requestId);`,
    },
    // ========== VALID: Test file ==========
    {
      code: `console.log(process.env);`,
      filename: 'handler.test.ts',
    },
    // ========== VALID: Not a logging call ==========
    {
      code: `const env = process.env;`,
    },
    {
      code: `validateConfig(process.env);`,
    },
    // ========== VALID: Other object logging ==========
    {
      code: `console.log(JSON.stringify({ config }));`,
    },
  ],
  invalid: [
    // ========== INVALID: Direct process.env logging ==========
    {
      code: `console.log(process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      code: `console.info(process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      code: `console.debug(process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    // ========== INVALID: JSON.stringify of process.env ==========
    {
      code: `console.log(JSON.stringify(process.env));`,
      errors: [{ messageId: 'envLogging' }],
    },
    // ========== INVALID: Logger with process.env ==========
    {
      code: `logger.info(process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    {
      code: `log.debug(process.env);`,
      errors: [{ messageId: 'envLogging' }],
    },
    // ========== INVALID: Test file with allowInTests: false ==========
    {
      code: `console.log(process.env);`,
      filename: 'handler.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'envLogging' }],
    },
  ],
});
