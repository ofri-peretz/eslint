import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireTimeoutHandling } from './index';

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

ruleTester.run('require-timeout-handling', requireTimeoutHandling, {
  valid: lambda([
    // Test file (allowed by default)
    {
      name: 'a test file is exempt',
      code: `
        export const handler = async (event, context) => {
          await fetch('https://api.example.com');
        };
      `,
      filename: 'handler.test.ts',
    },
    // Handler with getRemainingTimeInMillis check
    {
      code: `
        export const handler = async (event, context) => {
          const remaining = context.getRemainingTimeInMillis();
          if (remaining < 5000) return { statusCode: 503 };
          await fetch('https://api.example.com/data');
        };
      `,
    },
    // Handler with AbortController (timeout pattern)
    {
      code: `
        export const handler = async (event, context) => {
          const controller = new AbortController();
          await fetch('https://api.example.com', { signal: controller.signal });
        };
      `,
    },
    // Handler with Promise.race (timeout pattern)
    {
      code: `
        export const handler = async (event, context) => {
          await Promise.race([
            fetch('https://api.example.com'),
            new Promise((_, reject) => setTimeout(reject, 5000))
          ]);
        };
      `,
    },
    // Handler without external calls — no timeout needed
    {
      code: `
        export const handler = async (event, context) => {
          return { statusCode: 200, body: JSON.stringify({ hello: 'world' }) };
        };
      `,
    },
    // Handler without context param — can't check timeout
    {
      code: `
        export const handler = async (event) => {
          await fetch('https://api.example.com');
        };
      `,
    },
    // Non-handler function — should not trigger
    {
      code: `
        async function fetchData(url) {
          return await fetch(url);
        }
      `,
    },
    // Handler using ctx as context param name
    {
      code: `
        export const handler = async (event, ctx) => {
          const time = ctx.getRemainingTimeInMillis();
          await fetch('https://api.example.com');
        };
      `,
    },
  ]),

  invalid: lambda([
    // Lambda handler with fetch but no timeout handling (classic FN)
    {
      name: 'an outbound call with no timeout can burn the whole invocation',
      code: `
        export const handler = async (event, context) => {
          const data = await fetch('https://api.example.com/data');
          return { statusCode: 200, body: JSON.stringify(data) };
        };
      `,
      errors: [{ messageId: 'missingTimeoutHandling' }],
    },
    // Handler with axios call, no timeout
    {
      code: `
        export const handler = async (event, context) => {
          const result = await axios('https://api.example.com');
          return { statusCode: 200, body: result.data };
        };
      `,
      errors: [{ messageId: 'missingTimeoutHandling' }],
    },
    // Handler with AWS SDK send, no timeout
    {
      code: `
        export const handler = async (event, context) => {
          await client.send(new GetItemCommand(params));
        };
      `,
      errors: [{ messageId: 'missingTimeoutHandling' }],
    },
    // Handler with db.query, no timeout
    {
      code: `
        export const handler = async (event, context) => {
          const result = await db.query('SELECT * FROM users');
          return { statusCode: 200, body: JSON.stringify(result) };
        };
      `,
      errors: [{ messageId: 'missingTimeoutHandling' }],
    },
    // Handler with db.execute, no timeout
    {
      code: `
        export const handler = async (event, context) => {
          await db.execute('INSERT INTO logs VALUES (1)');
        };
      `,
      errors: [{ messageId: 'missingTimeoutHandling' }],
    },
    // Handler with db.connect, no timeout
    {
      code: `
        export const handler = async (event, context) => {
          await db.connect();
          const result = await db.query('SELECT 1');
        };
      `,
      errors: [{ messageId: 'missingTimeoutHandling' }],
    },
    // Handler with got HTTP client, no timeout
    {
      code: `
        export const handler = async (event, context) => {
          await got('https://api.example.com');
        };
      `,
      errors: [{ messageId: 'missingTimeoutHandling' }],
    },
    // Handler with lambda invoke, no timeout
    {
      code: `
        export const handler = async (event, context) => {
          await lambda.invoke({ FunctionName: 'other' });
        };
      `,
      errors: [{ messageId: 'missingTimeoutHandling' }],
    },
    // FunctionDeclaration handler
    {
      code: `
        async function handler(event, context) {
          await fetch('https://api.example.com');
        }
      `,
      errors: [{ messageId: 'missingTimeoutHandling' }],
    },
    // Using 'lambdaContext' as param name
    {
      code: `
        export const handler = async (event, lambdaContext) => {
          await fetch('https://api.example.com');
        };
      `,
      errors: [{ messageId: 'missingTimeoutHandling' }],
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
  'require-timeout-handling (function-exit selector regression)',
  requireTimeoutHandling,
  {
    valid: lambda([
      // Clean handler of each node type — exit listeners run, no crash, no FP.
      {
        code: `export const handler = async (event, context) => {
          return { statusCode: 200 };
        };`,
      },
      {
        code: `export const handler = async function (event, context) {
          return { statusCode: 200 };
        };`,
      },
      {
        code: `async function handler(event, context) {
          return { statusCode: 200 };
        }`,
      },
    ]),
    invalid: lambda([
      // External call + no timeout handling reports once per node type.
      {
        code: `export const handler = async (event, context) => {
          await fetch('https://api.example.com');
        };`,
        errors: [{ messageId: 'missingTimeoutHandling' }],
      },
      {
        code: `export const handler = async function (event, context) {
          await fetch('https://api.example.com');
        };`,
        errors: [{ messageId: 'missingTimeoutHandling' }],
      },
      {
        code: `async function handler(event, context) {
          await fetch('https://api.example.com');
        }`,
        errors: [{ messageId: 'missingTimeoutHandling' }],
      },
    ]),
  },
);
