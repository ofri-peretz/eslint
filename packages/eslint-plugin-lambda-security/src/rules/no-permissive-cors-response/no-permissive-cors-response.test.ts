import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, expect, it } from 'vitest';
import { noPermissiveCorsResponse } from './index';

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


const ruleTester = new RuleTester();

// ========== REGRESSION LOCK: no dead options ==========
// The rule used to declare `allowedOrigins` in its schema without ever reading
// it in create(). ESLint's config validation accepted it, so a user who set
// `['error', { allowedOrigins: [...] }]` got silent no-op behaviour with nothing
// to tip them off. Any option added here must actually be honoured by create().
describe('no-permissive-cors-response schema', () => {
  it('declares only the options the rule reads', () => {
    const [schema] = noPermissiveCorsResponse.meta.schema as {
      properties: Record<string, unknown>;
    }[];

    expect(Object.keys(schema.properties)).toEqual(['allowInTests']);
  });
});

ruleTester.run('no-permissive-cors-response', noPermissiveCorsResponse, {
  valid: lambda([
    // ========== VALID: Specific origin ==========
    {
      name: 'a named origin',
      code: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': 'https://example.com' },
          body: JSON.stringify(data)
        };
      `,
    },
    // ========== VALID: Dynamic origin from event ==========
    {
      code: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': event.headers.origin },
          body: JSON.stringify(data)
        };
      `,
    },
    // ========== VALID: No CORS header (API Gateway handles it) ==========
    {
      code: `
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        };
      `,
    },
    // ========== VALID: Test file with wildcard ==========
    {
      code: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: 'test'
        };
      `,
      filename: 'handler.test.ts',
    },
    // ========== VALID: Variable for origin ==========
    {
      code: `
        const allowedOrigin = getAllowedOrigin();
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': allowedOrigin },
          body: JSON.stringify(data)
        };
      `,
    },
    // ========== VALID: Non-Lambda response structure ==========
    {
      code: `
        return { data: '*', headers: { 'Access-Control-Allow-Origin': '*' } };
      `,
    },
    // ========== VALID: Implicit-return arrow, non-Lambda shape ==========
    {
      code: `
        const config = () => ({ headers: { 'Access-Control-Allow-Origin': '*' } });
      `,
    },
  ]),
  invalid: lambda([
    // ========== INVALID: Wildcard origin in return ==========
    {
      name: "Access-Control-Allow-Origin '*' on a handler response",
      code: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(data)
        };
      `,
      output: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': "https://your-domain.com" },
          body: JSON.stringify(data)
        };
      `,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: Response variable with wildcard ==========
    {
      code: `
        const response = {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: 'data'
        };
      `,
      output: `
        const response = {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': "https://your-domain.com" },
          body: 'data'
        };
      `,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: 4xx response with wildcard ==========
    {
      code: `
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Bad request' })
        };
      `,
      output: `
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': "https://your-domain.com" },
          body: JSON.stringify({ error: 'Bad request' })
        };
      `,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: Test file with allowInTests: false ==========
    {
      code: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: 'test'
        };
      `,
      output: `
        return {
          statusCode: 200,
          headers: { 'Access-Control-Allow-Origin': "https://your-domain.com" },
          body: 'test'
        };
      `,
      filename: 'handler.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: Explicit-return response factory ==========
    // Locks the docs claim that response factories ARE detected.
    {
      code: `
        function createResponse(body) {
          return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(body)
          };
        }
      `,
      output: `
        function createResponse(body) {
          return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': "https://your-domain.com" },
            body: JSON.stringify(body)
          };
        }
      `,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: Implicit-return arrow response helper ==========
    {
      code: `
        const jsonResponse = (statusCode, data) => ({
          statusCode,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify(data)
        });
      `,
      output: `
        const jsonResponse = (statusCode, data) => ({
          statusCode,
          headers: { 'Access-Control-Allow-Origin': "https://your-domain.com" },
          body: JSON.stringify(data)
        });
      `,
      errors: [{ messageId: 'permissiveCors' }],
    },
  ]),
});
