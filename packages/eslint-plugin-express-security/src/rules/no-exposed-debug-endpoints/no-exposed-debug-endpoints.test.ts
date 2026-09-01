/**
 * @fileoverview Tests for no-exposed-debug-endpoints
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noExposedDebugEndpoints } from './index';

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


const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-exposed-debug-endpoints', noExposedDebugEndpoints, {
  valid: xp([
    'const x = 42;',
    'const flag = true;',
    'function noop() {}',
    // Safe endpoints
    { name: 'an ordinary API route', code: "app.get('/api/users', handler)" },
    { code: "router.post('/login', authenticate)" },
    // Non-route code
    { code: 'const x = 1' },
  ]),

  invalid: xp([
    // Debug endpoints (now caught once)
    {
      name: 'a /debug route in the deployed app',
      code: "app.get('/debug', debugHandler)",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Every express route-registration method, not just get/post/use
    {
      code: "app.delete('/admin/users/:id', handler)",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "router.all('/health', handler)",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Chained route builder — app.route(path).verb(handler)
    {
      code: "app.route('/admin').delete(handler)",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "router.route('/test').get(handler)",
      errors: [{ messageId: 'violationDetected' }],
    },
  ]),
});

// ---------------------------------------------------------------------------
// Regression: bare string literals are NOT route registrations
//
// The rule used to report any string literal equal to a debug path anywhere
// in the file — a redirect-URL constant tripped it while authoring benchmark
// corpus fixtures. Only the path argument of an express route registration
// counts.
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-exposed-debug-endpoints (bare literals)',
  noExposedDebugEndpoints,
  {
    valid: xp([
      // constant declarations
      { code: "const ADMIN_PATH = '/admin';" },
      { code: "const path = '/debug';" },
      { code: "const HEALTH = '/health';" },
      // redirect targets — the reported false positive
      { code: "res.redirect('/admin');" },
      { code: "res.redirect(302, '/health');" },
      // comparisons
      { code: "if (req.path === '/admin') { next(); }" },
      { code: "const isDebug = url === '/debug';" },
      // object / array members and logging
      { code: "const routes = { admin: '/admin', health: '/health' };" },
      { code: "const PUBLIC = ['/health', '/test'];" },
      { code: "log('/admin');" },
      // debug literal in an express call but not the path argument
      { code: "app.get('/safe', '/debug');" },
      // non-express object with a matching method name
      { code: "fetchClient.get('/admin');" },
    ]),
    invalid: [],
  },
);

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-exposed-debug-endpoints (coverage wave)',
  noExposedDebugEndpoints,
  {
    valid: xp([
      // ignoreFiles matching the current filename disables the rule
      {
        code: `app.get('/debug', handler);`,
        options: [{ ignoreFiles: ['scripts/'] }],
        filename: '/project/scripts/dev-server.ts',
      },
      // route path is a variable, not a literal
      { code: `app.get(routePath, handler);` },
      // route path is a non-string literal
      { code: `app.get(42, handler);` },
      // route registration with no arguments at all
      { code: `app.use();` },
      // express object, but not a route-registration method
      { code: `app.listen(3000);` },
      // `app.get(name)` with a single argument reads an application setting,
      // it does not register a route
      { code: `const v = app.get('/debug');` },
      // computed member call on an express object
      { code: `app[method]('/admin', handler);` },
      // plain (non-member) call
      { code: `handler('/admin');` },
      // literal only *contains* a debug path, in a safe position
      { code: `const x = '/debugging-guide';` },
    ]),
    invalid: xp([
      // path containing a debug segment is still a route registration
      {
        code: `app.use('/admin/panel', adminRouter);`,
        errors: [{ messageId: 'violationDetected' }],
      },
      // custom endpoints option replaces the default list
      {
        code: `app.get('/internal-metrics', handler);`,
        options: [{ endpoints: ['/internal-metrics'] }],
        errors: [{ messageId: 'violationDetected' }],
      },
      // ignoreFiles that does not match leaves the rule active
      {
        code: `app.get('/debug', handler);`,
        options: [{ ignoreFiles: ['scripts/'] }],
        filename: '/project/src/server.ts',
        errors: [{ messageId: 'violationDetected' }],
      },
    ]),
  },
);
