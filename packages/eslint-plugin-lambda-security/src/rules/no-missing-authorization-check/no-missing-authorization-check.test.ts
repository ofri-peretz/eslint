import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noMissingAuthorizationCheck } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('no-missing-authorization-check', noMissingAuthorizationCheck, {
  valid: [
    // Test file (allowed by default)
    {
      code: `
        export const handler = async (event) => {
          await db.query('DELETE FROM users');
        };
      `,
      filename: 'handler.test.ts',
    },
  ],
  invalid: [],
});
