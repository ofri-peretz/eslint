import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnboundedBatchProcessing } from './index';

/**
 * Every fixture carries the Lambda handler shape, because the rules now abstain
 * in files that are not Lambda code. Wrapping the arrays rather than editing
 * each fixture means one cannot be left behind — a fixture missing the shape
 * would pass vacuously on the gate instead of exercising the detection it was
 * written for.
 */
const asLambda = (code: string): string =>
  `import type { Handler } from 'aws-lambda';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const lambda = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asLambda(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asLambda(test.code),
      // Autofix and suggestion fixtures assert the WHOLE file back, so every
      // `output` needs the same prefix or each fixable rule fails on the header
      // alone — including the ones nested under errors[].suggestions[].
      ...(typeof test.output === 'string' ? { output: asLambda(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asLambda(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

ruleTester.run('no-unbounded-batch-processing', noUnboundedBatchProcessing, {
  valid: lambda([
    // Test file (allowed)
    {
      name: 'a test file is exempt',
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
  ]),

  invalid: lambda([
    // Lambda handler processing Records without size check (classic FN)
    {
      name: 'every record processed with no bound on how many arrive',
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
  ]),
});

// Regression lock — function-exit `:exit` selector (ESLint 9 "Unknown class
// name: exit" crash). The exit report fires from three SEPARATE listeners after
// the fix split the comma-joined
// 'ArrowFunctionExpression:exit, FunctionExpression:exit, FunctionDeclaration:exit'
// key (ESLint strips only a trailing ':exit', so the comma form leaks ':exit'
// into esquery and throws). Exercise all three function node types: a
// reintroduced comma-joined selector crashes here, and a dropped per-node-type
// listener stops that case reporting.
ruleTester.run(
  'no-unbounded-batch-processing (function-exit selector regression)',
  noUnboundedBatchProcessing,
  {
    valid: lambda([
      // Clean handler of each node type — exit listeners run, no crash, no FP.
      {
        code: `export const handler = async (event) => {
          return { statusCode: 200, body: event.body };
        };`,
      },
      {
        code: `export const handler = async function (event) {
          return { statusCode: 200, body: event.body };
        };`,
      },
      {
        code: `async function handler(event) {
          return { statusCode: 200, body: event.body };
        }`,
      },
    ]),
    invalid: lambda([
      // Unbounded Records iteration reports once per node type.
      {
        code: `export const handler = async (event) => {
          for (const record of event.Records) {
            await processRecord(record);
          }
        };`,
        errors: [{ messageId: 'unboundedBatch' }],
      },
      {
        code: `export const handler = async function (event) {
          for (const record of event.Records) {
            await processRecord(record);
          }
        };`,
        errors: [{ messageId: 'unboundedBatch' }],
      },
      {
        code: `async function handler(event) {
          for (const record of event.Records) {
            await processRecord(record);
          }
        }`,
        errors: [{ messageId: 'unboundedBatch' }],
      },
    ]),
  },
);
