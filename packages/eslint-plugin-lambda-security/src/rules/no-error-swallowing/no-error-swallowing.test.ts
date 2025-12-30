import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noErrorSwallowing } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('no-error-swallowing', noErrorSwallowing, {
  valid: [
    // Rethrows the error
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {
          throw error;
        }
      `,
    },
    // Test file (allowed)
    {
      code: `
        try {
          riskyOperation();
        } catch (error) {}
      `,
      filename: 'handler.test.ts',
    },
  ],
  invalid: [],
});
