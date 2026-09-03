import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnvalidatedEventBody } from './index';

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

ruleTester.run('no-unvalidated-event-body', noUnvalidatedEventBody, {
  valid: lambda([
    // One case per DEFAULT_VALIDATION_METHOD_NAMES entry no other case reaches.
    {
      name: 'middy httpJsonBodyParser validates the body',
      code: `
        export const handler = middy(async (event) => {
          return { statusCode: 200, body: event.body };
        }).use(httpJsonBodyParser());
      `,
    },
    {
      name: 'zod parseAsync validates the body',
      code: `
        export const handler = async (event) => {
          const data = await schema.parseAsync(event.body);
          return { statusCode: 200 };
        };
      `,
    },
    {
      name: 'zod safeParseAsync validates the body',
      code: `
        export const handler = async (event) => {
          const data = await schema.safeParseAsync(event.body);
          return { statusCode: 200 };
        };
      `,
    },
    // A hand-written checker: `check` is not one of the schema-library verbs
    // we guessed, so the handler read as unvalidated.
    {
      name: 'a validation method the consumer named',
      code: `
        export const handler = async (event) => {
          const data = check(event.body);
          return { statusCode: 200 };
        };
      `,
      options: [{ validationMethodNames: ['check'] }],
    },
    // Validation with Zod
    {
      name: 'the body is parsed through a zod schema',
      code: `
        import { z } from 'zod';
        const schema = z.object({ name: z.string() });
        export const handler = async (event) => {
          const data = schema.parse(JSON.parse(event.body));
          return { statusCode: 200 };
        };
      `,
    },
    // Validation with Joi
    {
      code: `
        const Joi = require('joi');
        export const handler = async (event) => {
          const { value } = schema.validate(event.body);
          return { statusCode: 200 };
        };
      `,
    },
    // Middy with validator middleware
    {
      code: `
        import middy from '@middy/core';
        import { validator } from '@middy/validator';
        const handler = middy(baseHandler).use(validator({ inputSchema }));
      `,
    },
    // Safe: typeof check
    {
      code: `
        export const handler = async (event) => {
          if (typeof event.body === 'string') {
            console.log('body is string');
          }
        };
      `,
    },
    // Safe: null check in if statement
    {
      code: `
        export const handler = async (event) => {
          if (event.body) {
            console.log('has body');
          }
        };
      `,
    },
    // Safe: console.log for debugging
    {
      code: `
        export const handler = async (event) => {
          console.log(event.body);
          return { statusCode: 200 };
        };
      `,
    },
    // Not a Lambda handler parameter name
    {
      code: `
        export const handler = async (data) => {
          const result = data.body;
          return { statusCode: 200 };
        };
      `,
    },
    // Optional chaining (safe pattern)
    {
      code: `
        export const handler = async (event) => {
          const name = event.body?.name;
          return { statusCode: 200 };
        };
      `,
    },
    // Validated parse chain behind a nullish-coalescing default
    {
      code: `
        import { z } from 'zod';
        const schema = z.object({ name: z.string() });
        export const handler = async (event) => {
          const result = schema.safeParse(JSON.parse(event.body ?? '{}'));
          return { statusCode: 200 };
        };
      `,
    },
    // Same, with the older || default and a non-null assertion
    {
      code: `
        export const handler = async (event) => {
          const data = schema.parse(JSON.parse(event.body || '{}'));
          const more = schema.parse(event.body!);
          return { statusCode: 200 };
        };
      `,
    },
    // Null check inside a compound condition
    {
      code: `
        export const handler = async (event) => {
          if (event.httpMethod === 'POST' && event.body) {
            console.log('has body');
          }
        };
      `,
    },
    // Test file (allowed by default)
    {
      code: `
        export const handler = async (event) => {
          const body = event.body;
        };
      `,
      filename: 'handler.test.ts',
    },
  ]),
  invalid: lambda([
    {
      name: 'the default validation verbs replaced away',
      code: `
        import { z } from 'zod';
        const schema = z.object({ name: z.string() });
        export const handler = async (event) => {
          const data = schema.parse(JSON.parse(event.body));
          return { statusCode: 200 };
        };
      `,
      options: [{ validationMethodNames: ['check'] }],
      errors: [{ messageId: 'unvalidatedInput' }],
    },
    // Direct use of event.body in variable assignment
    {
      name: 'event.body used with no schema between it and the code',
      code: `
        export const handler = async (event) => {
          const data = event.body;
          return { statusCode: 200 };
        };
      `,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
    // Direct use of queryStringParameters
    {
      code: `
        export const handler = async (event) => {
          const params = event.queryStringParameters;
          return { statusCode: 200 };
        };
      `,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
    // Direct use of pathParameters
    {
      code: `
        export const handler = async (event) => {
          const path = event.pathParameters;
          return { statusCode: 200 };
        };
      `,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
    // 'req' alias for event
    {
      code: `
        export const handler = async (req) => {
          const data = req.body;
          return { statusCode: 200 };
        };
      `,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
  ]),
});

/**
 * The `fileImportsLambda` probe is an OR chain over every import in the file,
 * and `.some()` stops at the first match — so once the shared `lambda()` helper
 * prepends `aws-lambda`, the later arms (`@aws-sdk/`, `@middy/`,
 * `@aws-cdk/aws-lambda`) are never reached by any wrapped fixture.
 *
 * These cases are deliberately NOT wrapped: each names exactly one AWS import,
 * which is both the file's Lambda evidence for the plugin-wide gate and the arm
 * of the chain under test.
 *
 * The probe is narrower than the gate on purpose. It answers "may a *single*
 * `event` argument count as a handler?", where the gate answers "is this file
 * Lambda code at all?" — a handler export must not be allowed to promote every
 * one-arg `event` function in the file.
 */
ruleTester.run('single-arg event, per import source', noUnvalidatedEventBody, {
  valid: [],
  invalid: [
    {
      name: '@aws-sdk/ subpath import',
      code: `import { S3Client } from '@aws-sdk/client-s3';
        const run = async (event) => { const data = event.body; return data; };`,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
    {
      name: '@middy/ subpath import',
      code: `import middy from '@middy/core';
        const run = async (event) => { const data = event.body; return data; };`,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
    {
      name: '@aws-cdk/aws-lambda arm (gate satisfied separately)',
      // `@aws-cdk/aws-lambda` must be the ONLY import: `.some()` stops at the
      // first arm that matches, so any earlier AWS import hides this one. The
      // plugin-wide gate is satisfied by the (event, context) function instead.
      code: `import * as cdk from '@aws-cdk/aws-lambda';
        const boot = async (event, context) => cdk.Runtime;
        const run = async (event) => { const data = event.body; return data; };`,
      errors: [{ messageId: 'unvalidatedInput' }],
    },
  ],
});
