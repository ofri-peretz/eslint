import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, expect, it } from 'vitest';
import { noPermissiveCorsMidly } from './index';

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
// Sibling of no-permissive-cors-response, which shipped a declared-but-never-read
// `allowedOrigins`. This rule is clean — keep it that way: an option added here
// must actually be honoured by create().
describe('no-permissive-cors-middy schema', () => {
  it('declares only the options the rule reads', () => {
    const [schema] = noPermissiveCorsMidly.meta.schema as {
      properties: Record<string, unknown>;
    }[];

    expect(Object.keys(schema.properties)).toEqual(['allowInTests']);
  });
});

ruleTester.run('no-permissive-cors-middy', noPermissiveCorsMidly, {
  valid: lambda([
    // ========== VALID: Specific origins ==========
    {
      name: 'an explicit origin list',
      code: `
        middy(handler).use(httpCors({ origins: ['https://example.com'] }));
      `,
    },
    {
      code: `
        middy(handler).use(cors({ origin: 'https://example.com' }));
      `,
    },
    // ========== VALID: Multiple allowed origins ==========
    {
      code: `
        middy(handler).use(httpCors({ 
          origins: ['https://example.com', 'https://app.example.com'] 
        }));
      `,
    },
    // ========== VALID: Dynamic origin function ==========
    {
      code: `
        middy(handler).use(httpCors({ 
          origins: (event) => validateOrigin(event.headers.origin) 
        }));
      `,
    },
    // ========== VALID: Test file ==========
    {
      code: `middy(handler).use(httpCors({ origin: '*' }));`,
      filename: 'handler.test.ts',
    },
    // ========== VALID: Other middleware (not CORS) ==========
    {
      code: `
        middy(handler)
          .use(validator({ eventSchema }))
          .use(httpSecurityHeaders());
      `,
    },
    // ========== VALID: Variable for origins ==========
    {
      code: `
        const allowedOrigins = getAllowedOrigins();
        middy(handler).use(httpCors({ origins: allowedOrigins }));
      `,
    },
  ]),
  invalid: lambda([
    // ========== INVALID: No arguments (defaults to permissive) ==========
    {
      name: 'httpCors with no origins defaults to any origin',
      code: `middy(handler).use(httpCors());`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    {
      code: `middy(handler).use(cors());`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: Wildcard origin string ==========
    {
      code: `middy(handler).use(httpCors({ origin: '*' }));`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    {
      code: `middy(handler).use(cors({ origins: '*' }));`,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: Wildcard in origins array ==========
    {
      code: `
        middy(handler).use(httpCors({ origins: ['*'] }));
      `,
      errors: [{ messageId: 'permissiveCors' }],
    },
    {
      code: `
        middy(handler).use(httpCors({ origins: ['https://example.com', '*'] }));
      `,
      errors: [{ messageId: 'permissiveCors' }],
    },
    // ========== INVALID: Test file with allowInTests: false ==========
    {
      code: `middy(handler).use(httpCors());`,
      filename: 'handler.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'permissiveCors' }],
    },
  ]),
});
