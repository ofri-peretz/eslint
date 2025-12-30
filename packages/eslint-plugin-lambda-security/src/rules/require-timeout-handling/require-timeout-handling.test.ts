import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireTimeoutHandling } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('require-timeout-handling', requireTimeoutHandling, {
  valid: [
    // Test file (allowed by default)
    {
      code: `
        export const handler = async (event, context) => {
          await fetch('https://api.example.com');
        };
      `,
      filename: 'handler.test.ts',
    },
  ],
  invalid: [],
});
