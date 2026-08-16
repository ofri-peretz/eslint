/**
 * @fileoverview Tests for no-permissive-cors
 *
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noPermissiveCors } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-permissive-cors', noPermissiveCors, {
  valid: [
    'const x = 42;',
    'const flag = true;',
    'function noop() {}',
    'const items = [];',
    { code: "cors({ origin: 'https://example.com' })" },
    { code: "res.setHeader('Access-Control-Allow-Origin', 'https://mysite.com')" },
    { code: "const origin = 'https://safe.com'" },

    // An allowlist, a predicate and a callback are all real origin decisions.
    { code: "cors({ origin: ['https://a.example', 'https://b.example'] })" },
    { code: 'cors({ origin: allowedOrigins })' },
    {
      code: 'cors({ origin: (origin, cb) => cb(null, allowed.includes(origin)) })',
    },
    { code: 'cors({ origin: /\\.example\\.com$/ })' },
    // `origin: false` disables CORS entirely.
    { code: 'cors({ origin: false })' },
    // No origin key at all — the package default is `*`, but that is the
    // absence this rule does not claim to cover; no-missing-cors-check does.
    { code: 'cors({ credentials: true })' },
    { code: 'cors()' },

    // A wildcard on a header that is not the CORS origin.
    { code: "res.setHeader('Access-Control-Allow-Headers', '*')" },
    { code: "res.setHeader('Vary', 'Origin')" },
    // A plain object that happens to have an `origin` key.
    { code: "const event = { origin: '*' }" },
    // Someone else's `cors` shaped call with a non-object argument.
    { code: "cors('*')" },
  ],

  invalid: [
    { code: "cors({ origin: '*' })", errors: [{ messageId: 'violationDetected' }] },
    {
      code: "res.setHeader('Access-Control-Allow-Origin', '*')",
      errors: [{ messageId: 'violationDetected' }],
    },

    // `origin: true` reflects the request Origin header — every origin, and
    // unlike `'*'` it still works with credentials. Only `'*'` was caught.
    { code: 'cors({ origin: true })', errors: [{ messageId: 'violationDetected' }] },
    {
      code: 'cors({ origin: true, credentials: true })',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Mounted as middleware, which is how it is actually written.
    {
      code: "app.use(cors({ origin: '*' }))",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "router.use(cors({ origin: '*', credentials: true }))",
      errors: [{ messageId: 'violationDetected' }],
    },
    // The header form on a Node ServerResponse.
    {
      code: "function handler(req, res) { res.setHeader('Access-Control-Allow-Origin', '*'); res.end(); }",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
