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
    // Handler with Records.length check before processing
    {
      code: `
        export const handler = async (event) => {
          if (event.Records.length > 100) throw new Error('Batch too large');
          for (const record of event.Records) {
            await processRecord(record);
          }
        };
      `,
    },
    // Handler with slice to limit batch
    {
      code: `
        export const handler = async (event) => {
          const batch = event.Records.slice(0, 10);
          for (const record of batch) {
            await processRecord(record);
          }
        };
      `,
    },
    // Handler with chunk utility
    {
      code: `
        export const handler = async (event) => {
          const batches = chunk(event.Records, 10);
          for (const batch of batches) {
            await processBatch(batch);
          }
        };
      `,
    },
    // Handler with take utility
    {
      code: `
        export const handler = async (event) => {
          const limited = take(event.Records, 10);
          for (const record of limited) {
            await processRecord(record);
          }
        };
      `,
    },
    // Handler with splice
    {
      code: `
        export const handler = async (event) => {
          const batch = event.Records.splice(0, 50);
          for (const record of batch) {
            await processRecord(record);
          }
        };
      `,
    },
    // Handler with length comparison using <=
    {
      code: `
        export const handler = async (event) => {
          if (event.Records.length <= 10) {
            for (const record of event.Records) {
              await processRecord(record);
            }
          }
        };
      `,
    },
    // Handler without batch access — no issue
    {
      code: `
        export const handler = async (event) => {
          return { statusCode: 200, body: event.body };
        };
      `,
    },
    // Non-handler function — should not trigger
    {
      code: `
        function processAll(data) {
          for (const item of data.Records) {
            processItem(item);
          }
        }
      `,
    },
  ],

  invalid: [
    // Lambda handler processing Records without size check (classic FN)
    {
      code: `
        export const handler = async (event) => {
          for (const record of event.Records) {
            await processRecord(record);
          }
        };
      `,
      errors: [{ messageId: 'unboundedBatch' }],
    },
    // Handler accessing event.records (lowercase)
    {
      code: `
        export const handler = async (event) => {
          event.records.forEach(async (record) => {
            await processRecord(record);
          });
        };
      `,
      errors: [{ messageId: 'unboundedBatch' }],
    },
    // Handler accessing event.items without size check
    {
      code: `
        export const handler = async (event) => {
          for (const item of event.items) {
            await processItem(item);
          }
        };
      `,
      errors: [{ messageId: 'unboundedBatch' }],
    },
    // Handler accessing event.messages without size check
    {
      code: `
        export const handler = async (event) => {
          for (const msg of event.messages) {
            await processMessage(msg);
          }
        };
      `,
      errors: [{ messageId: 'unboundedBatch' }],
    },
    // FunctionDeclaration handler
    {
      code: `
        async function handler(event) {
          for (const record of event.Records) {
            await process(record);
          }
        }
      `,
      errors: [{ messageId: 'unboundedBatch' }],
    },
    // Using 'evt' as event param
    {
      code: `
        export const handler = async (evt) => {
          for (const record of evt.Records) {
            await processRecord(record);
          }
        };
      `,
      errors: [{ messageId: 'unboundedBatch' }],
    },
  ],
});
