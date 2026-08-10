import { RuleTester } from '@typescript-eslint/rule-tester';
import { noExpressUnsafeRegexRoute } from './index';

/**
 * Every fixture imports express, because the rules now abstain in files with no
 * Express in them. Wrapping the arrays rather than editing each fixture means
 * one cannot be left behind — a fixture missing the import would pass vacuously
 * on the gate instead of exercising the detection it was written for. `output`
 * and errors[].suggestions[].output are prefixed too, since autofix fixtures
 * assert the whole file back.
 */
// A SIDE-EFFECT import: it satisfies the gate without reserving the `express`
// binding. Several fixtures already declare `const express = require('express')`
// at module level, and a default import would redeclare it.
const asExpress = (code: string): string => `import 'express';\n${code}`;
type Suggestion = { output?: string | null };
type Case = {
  code: string;
  output?: string | null;
  errors?: ReadonlyArray<{ suggestions?: readonly Suggestion[] } | string>;
};
const xp = <T,>(cases: T[]): T[] =>
  cases.map((c) => {
    if (typeof c === 'string') return asExpress(c) as T;
    const test = c as Case;
    return {
      ...c,
      code: asExpress(test.code),
      ...(typeof test.output === 'string' ? { output: asExpress(test.output) } : {}),
      ...(test.errors
        ? {
            errors: test.errors.map((e) =>
              typeof e === 'string' || !e.suggestions
                ? e
                : {
                    ...e,
                    suggestions: e.suggestions.map((s) =>
                      typeof s.output === 'string'
                        ? { ...s, output: asExpress(s.output) }
                        : s,
                    ),
                  },
            ),
          }
        : {}),
    } as T;
  });


const ruleTester = new RuleTester();

ruleTester.run('no-express-unsafe-regex-route', noExpressUnsafeRegexRoute, {
  valid: xp([
    // Simple string routes
    {
      code: `app.get('/api/users', handler)`,
    },
    {
      code: `app.post('/api/users/:id', handler)`,
    },
    {
      code: `router.get('/products/:id/details', handler)`,
    },
    // Simple regex routes
    {
      code: `app.get(/^\\/api\\/users$/, handler)`,
    },
    {
      code: `app.get(/^\\/products\\/[0-9]+$/, handler)`,
    },
    // Non-route methods
    {
      code: `app.listen(3000)`,
    },
    {
      code: `app.set('view engine', 'ejs')`,
    },
    // Test file with allowInTests
    {
      code: `app.get('/api/:path+', handler)`,
      filename: 'test.spec.ts',
      options: [{ allowInTests: true }],
    },
  ]),
  invalid: xp([
    // Vulnerable regex: nested quantifiers - simpler pattern
    {
      code: `app.get(/(a+)+/, handler)`,
      errors: [{ messageId: 'unsafeRegexRoute' }],
    },
    // Vulnerable regex: overlapping alternatives with quantifier
    {
      code: `app.get(/(a|ab)+/, handler)`,
      errors: [{ messageId: 'unsafeRegexRoute' }],
    },
    // Vulnerable param patterns: :param+
    {
      code: `app.get('/api/:path+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    // Vulnerable param patterns: :param*
    {
      code: `app.get('/api/:path*', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    // Router methods
    {
      code: `router.get('/files/:file+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    // Different HTTP methods
    {
      code: `app.post('/api/:id+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    {
      code: `app.put('/api/:id+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    {
      code: `app.delete('/api/:id+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    // app.all and app.use
    {
      code: `app.all('/api/:path+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    {
      code: `app.use('/api/:path+', handler)`,
      errors: [{ messageId: 'unsafeParamPattern' }],
    },
    // new RegExp() with vulnerable pattern
    {
      code: `app.get(new RegExp('(a+)+'), handler)`,
      errors: [{ messageId: 'unsafeRegexRoute' }],
    },
  ]),
});

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-express-unsafe-regex-route (coverage wave)',
  noExpressUnsafeRegexRoute,
  {
    valid: xp([
      // callee is not a member expression
      { code: `get('/users/:id', handler);` },
      // computed member access — property is a Literal, not an Identifier
      { code: `app['get']('/users', handler);` },
      // no route argument at all
      { code: `app.get();` },
      // new RegExp() without a pattern argument
      { code: `app.get(new RegExp(), handler);` },
      // new RegExp() with a non-string literal
      { code: `app.get(new RegExp(42), handler);` },
      // new RegExp() with an identifier pattern
      { code: `app.get(new RegExp(pattern), handler);` },
      // safe RegExp string
      { code: `app.get(new RegExp('/safe/path'), handler);` },
      // numeric literal route — not a string, not a regex
      { code: `app.get(42, handler);` },
      // identifier route
      { code: `app.get(routeVar, handler);` },
      // allowInTests: true + test filename
      {
        code: `app.get(/(a+)+$/, handler);`,
        options: [{ allowInTests: true }],
        filename: 'routes.spec.ts',
      },
    ]),
    invalid: xp([
      // allowInTests: true but non-test filename — still reported
      {
        code: `app.get(/(a+)+$/, handler);`,
        options: [{ allowInTests: true }],
        filename: 'routes.ts',
        errors: [{ messageId: 'unsafeRegexRoute' }],
      },
    ]),
  },
);
