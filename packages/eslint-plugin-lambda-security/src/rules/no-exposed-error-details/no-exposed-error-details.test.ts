import { describe, it, afterAll } from 'vitest';
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noExposedErrorDetails } from './index';

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

ruleTester.run('no-exposed-error-details', noExposedErrorDetails, {
  valid: lambda([
        'const x = 42;',
        'const flag = true;',
    // Generic error message
    {
      name: 'the stack is logged and a generic message is returned',
      code: `
        export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (error) {
            console.error(error);
            return { statusCode: 500, body: JSON.stringify({ message: 'Internal error' }) };
          }
        };
      `,
    },
    // Sanitized error (only message, not stack)
    {
      code: `
        export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
          }
        };
      `,
    },
    // Not in API response
    {
      code: `
        function logError(error) {
          console.log(error.stack);
        }
      `,
    },
    {
      name: 'a CloudFormation stack name is the application data, not a trace',
      code: `
        export const handler = async (event) => {
          const deployment = await describe();
          return { statusCode: 200, body: JSON.stringify({ stack: deployment.stack }) };
        };
      `,
    },
    {
      name: 'serializing a domain object is not serializing the error',
      code: `
        export const handler = async (event) => {
          const order = await load(event);
          return { statusCode: 200, body: JSON.stringify(order) };
        };
      `,
    },
    {
      name: 'serializing an undeclared payload',
      code: `export const handler = async () => ({ statusCode: 200, body: JSON.stringify(payload) });`,
    },
    {
      name: 'an empty JSON.stringify call',
      code: `export const handler = async () => ({ statusCode: 200, body: JSON.stringify() });`,
    },
    {
      name: 'a computed lookup and a computed key in the body',
      code: `export const handler = async (event) => ({ statusCode: 200, [field]: 1, body: JSON.stringify({ [name]: labels[key] }) });`,
    },
    {
      name: 'an object without a response shape',
      code: `const meta = { stack: error.stack };`,
    },
    // Test file (allowed)
    {
      code: `
        export const handler = async (event) => {
          return { statusCode: 500, body: JSON.stringify({ stack: error.stack }) };
        };
      `,
      filename: 'handler.test.ts',
    },
  ]),
  invalid: lambda([
    {
      name: 'the deployment directory in the response body',
      code: `
        export const handler = async (event) => {
          return { statusCode: 500, body: JSON.stringify({ path: __dirname, file: __filename }) };
        };
      `,
      errors: [
        { messageId: 'exposedErrorDetails' },
        { messageId: 'exposedErrorDetails' },
      ],
    },
    {
      name: 'a response built in a variable before it is returned',
      code: `
        export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (error) {
            const response = { statusCode: 500, body: JSON.stringify({ stack: error.stack }) };
            return response;
          }
        };
      `,
      errors: [{ messageId: 'exposedErrorDetails' }],
    },
    {
      name: 'a response handed to the Lambda callback',
      code: `
        export const handler = (event, context, callback) => {
          try {
            riskyOperation();
          } catch (error) {
            callback(null, { statusCode: 500, body: JSON.stringify(error) });
          }
        };
      `,
      errors: [{ messageId: 'exposedErrorDetails' }],
    },
    {
      name: 'a caught error under a name that does not say error',
      code: `
        export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (failure) {
            return { 'statusCode': 500, body: failure['stack'] };
          }
        };
      `,
      errors: [{ messageId: 'exposedErrorDetails' }],
    },
    // Exposed stack trace
    {
      name: 'the stack trace goes back to the caller in the response body',
      code: `
        export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (error) {
            return { statusCode: 500, body: JSON.stringify({ stack: error.stack }) };
          }
        };
      `,
      errors: [{ messageId: 'exposedErrorDetails' }],
    },
    // JSON.stringify entire error
    {
      code: `
        export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (error) {
            return { statusCode: 500, body: JSON.stringify(error) };
          }
        };
      `,
      errors: [{ messageId: 'exposedErrorDetails' }],
    },
    // Exposed cause
    {
      code: `
        export const handler = async (event) => {
          try {
            await riskyOperation();
          } catch (err) {
            return { statusCode: 500, body: JSON.stringify({ cause: err.cause }) };
          }
        };
      `,
      errors: [{ messageId: 'exposedErrorDetails' }],
    },
  ]),
});
