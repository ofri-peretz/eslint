/**
 * @fileoverview Tests for no-exposed-debug-endpoints
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noExposedDebugEndpoints } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-exposed-debug-endpoints', noExposedDebugEndpoints, {
  valid: [
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
    // Safe endpoints
    { code: "app.get('/api/users', handler)" },
    { code: "router.post('/login', authenticate)" },
    // Non-route code
    { code: "const x = 1" },
  ],

  invalid: [
    // Debug endpoints (now caught once)
    { 
      code: "app.get('/debug', debugHandler)", 
      errors: [{ messageId: 'violationDetected' }]
    },
    // Debug path literals only
    { 
      code: "const path = '/debug'", 
      errors: [{ messageId: 'violationDetected' }]
    },
    { 
      code: "const endpoint = '/admin'", 
      errors: [{ messageId: 'violationDetected' }]
    },
  ],
});

// ---------------------------------------------------------------------------
// Coverage wave: previously untested branches (annotation-debt removal)
// ---------------------------------------------------------------------------
ruleTester.run('no-exposed-debug-endpoints (coverage wave)', noExposedDebugEndpoints, {
  valid: [
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
    // literal only *contains* a debug path — Literal handler needs exact match
    { code: `const x = '/debugging-guide';` },
  ],
  invalid: [
    // exact-match literal outside any call
    { code: `const p = '/debug';`, errors: [{ messageId: 'violationDetected' }] },
    // literal inside a non-express call
    { code: `log('/admin');`, errors: [{ messageId: 'violationDetected' }] },
    // literal in an express call but not as the path argument
    { code: `app.get('/safe', '/debug');`, errors: [{ messageId: 'violationDetected' }] },
    // custom endpoints option replaces the default list
    {
      code: `app.get('/internal-metrics', handler);`,
      options: [{ endpoints: ['/internal-metrics'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
