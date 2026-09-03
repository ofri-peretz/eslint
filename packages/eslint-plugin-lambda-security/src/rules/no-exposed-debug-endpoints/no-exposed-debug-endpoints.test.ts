/**
 * @fileoverview Tests for no-exposed-debug-endpoints (Lambda)
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noExposedDebugEndpoints } from './index';

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


const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-exposed-debug-endpoints', noExposedDebugEndpoints, {
  valid: lambda([
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
    {
      name: 'an ordinary application route',
      code: "if (event.path === '/api/user') {}"
    },
    {
      code: "const ok = '/status-check'"
    }
  ]),

  invalid: lambda([
    {
      name: 'a /debug route reachable in the deployed function',
      code: "if (event.path === '/debug') {}",
      errors: [{ messageId: 'violationDetected' }]
    },
    {
      code: "if (event.rawPath.includes('/admin')) {}",
      errors: [{ messageId: 'violationDetected' }]
    },
    {
      code: "const p = '/__debug__'",
      errors: [{ messageId: 'violationDetected' }]
    },
    {
      code: `
        export const serverlessConfig = {
          functions: {
            debug: {
              events: [{ http: { path: '/debug' } }]
            }
          }
        }
      `,
      errors: [{ messageId: 'violationDetected' }]
    }
  ]),
});
