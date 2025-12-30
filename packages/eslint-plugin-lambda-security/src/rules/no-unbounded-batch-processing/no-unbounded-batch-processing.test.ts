import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnboundedBatchProcessing } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('no-unbounded-batch-processing', noUnboundedBatchProcessing, {
  valid: [
    // Test file (allowed)
    {
      code: `
        export const handler = async (event) => {
          for (const record of event.Records) {
            await processRecord(record);
          }
        };
      `,
      filename: 'handler.test.ts',
    },
  ],
  invalid: [],
});
