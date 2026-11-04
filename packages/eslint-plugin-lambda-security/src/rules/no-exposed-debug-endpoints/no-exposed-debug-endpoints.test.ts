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
const lambda = <T>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asLambda(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asLambda(test.code),
      // Autofix and suggestion fixtures assert the WHOLE file back, so every
      // `output` needs the same prefix or each fixable rule fails on the header
      // alone — including the ones nested under errors[].suggestions[].
      ...(typeof test.output === 'string'
        ? { output: asLambda(test.output) }
        : {}),
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
      code: "if (event.path === '/api/user') {}",
    },
    {
      code: "const ok = '/status-check'",
    },
    {
      name: 'a route that only shares letters with /test',
      code: "if (event.rawPath === '/testimonials') {}",
    },
    {
      name: 'a route that contains test without the slash boundary',
      code: "if (event.path === '/latest') {}",
    },
    {
      name: 'a sub-path compared with something that is not the route',
      code: "if (config.mode === '/debug/vars') {}",
    },
    {
      name: 'an undeclared rawPath is not read off the event',
      code: "if (rawPath === '/debug/vars') {}",
    },
    {
      name: 'a plain local named path is not destructured off the event',
      code: "const path = next(); if (path === '/debug/vars') {}",
    },
    {
      name: 'a switch on something other than the route',
      code: "switch (action) { case '/admin/users': break; default: break; }",
    },
    {
      name: 'a switch on the route with no debug case',
      code: "switch (event.rawPath) { case '/orders': break; default: break; }",
    },
    {
      name: 'a non-route string test',
      code: "if (event.rawPath.at('/debug/vars')) {}",
    },
    {
      name: 'a route test with a dynamic argument',
      code: 'if (event.rawPath.startsWith(prefix)) {}',
    },
    {
      name: 'a path: key in an object that is not a Serverless event',
      code: "const link = { path: '/debug/vars', label: 'Debug' };",
    },
    {
      name: 'a Serverless http event on an ordinary path',
      code: "export const sls = { functions: { f: { events: [{ http: { path: 'orders', method: 'get' } }] } } };",
    },
    {
      name: 'arithmetic comparison is not a route check',
      code: "if (event.path < '/debug/vars') {}",
    },
  ]),

  invalid: lambda([
    {
      name: 'a sub-path of /admin on the v2 rawPath',
      code: "if (event.rawPath === '/admin/users') {}",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'the v2 routeKey carries the method before the path',
      code: "if (event.routeKey === 'GET /admin') {}",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'the v2 requestContext.http.path',
      code: "if (event.requestContext.http.path === '/admin/users') {}",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'the route read through a string subscript',
      code: "if (event['rawPath'] === '/admin') {}",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'the route destructured off the event',
      code: "const { rawPath } = event; if (rawPath !== '/debug/vars') {}",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a switch dispatching on the route',
      code: "switch (event.rawPath) { case '/admin/users': break; default: break; }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a prefix test on the route',
      code: "if (event.rawPath.startsWith('/debug/')) {}",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a Serverless path written without the leading slash',
      code: "export const sls = { functions: { f: { events: [{ httpApi: { path: 'admin/users', method: 'get' } }] } } };",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a Serverless event key spelled as a string',
      code: "export const sls = { functions: { f: { events: [{ 'http': { 'path': '/admin', method: 'get' } }] } } };",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      name: 'a /debug route reachable in the deployed function',
      code: "if (event.path === '/debug') {}",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "if (event.rawPath.includes('/admin')) {}",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "const p = '/__debug__'",
      errors: [{ messageId: 'violationDetected' }],
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
      errors: [{ messageId: 'violationDetected' }],
    },
  ]),
});
