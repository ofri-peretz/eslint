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
    { name: 'a named origin', code: "cors({ origin: 'https://example.com' })" },
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
    { name: "origin '*'", code: "cors({ origin: '*' })", errors: [{ messageId: 'violationDetected' }] },
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

/**
 * Regression lock — the header is the same header however it is set.
 *
 * The rule recognised ONLY `res.setHeader` with two inline literals, so
 * `res.header(…)` (Express's alias, and the spelling most Express codebases
 * use), a wildcard reached through a constant, a declarative `ResponseInit`
 * and a Next.js config block all shipped a wildcard past a rule whose entire
 * job is that header. Five of nine corpus fixtures were missed on this alone.
 */
ruleTester.run('lock: every way of setting Allow-Origin', noPermissiveCors, {
  valid: [
    // A named origin, by any route.
    { code: `res.header('Access-Control-Allow-Origin', 'https://app.example.com');` },
    // A wildcard on ALLOW-METHODS grants no origin anything.
    { code: `res.setHeader('Access-Control-Allow-Methods', '*');` },
    // Timing-Allow-Origin exposes timing data, not response bodies.
    { code: `res.setHeader('Timing-Allow-Origin', '*');` },
    // A '*' in a ROUTE path is a wildcard over paths.
    { code: `app.options('*', handler);` },
    // Documentation naming the header and the wildcard sets nothing.
    {
      code: `const docs = [{ header: 'Access-Control-Allow-Origin', rule: 'never *' }];`,
    },
  ],
  invalid: [
    { code: `res.header('Access-Control-Allow-Origin', '*');`, errors: 1 },
    { code: `res.set('Access-Control-Allow-Origin', '*');`, errors: 1 },
    { code: `const O = '*'; res.setHeader('Access-Control-Allow-Origin', O);`, errors: 1 },
    // Case-insensitive: HTTP/2 requires lowercase on the wire.
    {
      code: `new Response('{}', { headers: { 'access-control-allow-origin': '*' } });`,
      errors: 1,
    },
    {
      code: `module.exports = { async headers() { return [{ source: '/api/(.*)', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }] }]; } };`,
      errors: 1,
    },
    // The options object reached through a constant.
    { code: `const C = { origin: '*' }; app.use(cors(C));`, errors: 1 },
  ],
});

/**
 * Regression lock — a REFLECTED origin is worse than a wildcard, not milder.
 *
 * A browser refuses to send credentials to a literal `*` and sends them
 * happily to an origin the server echoed back, so reflecting the raw request
 * Origin disables the same-origin policy for every attacker page at once. But
 * reflecting AFTER an allowlist check is the documented way to support several
 * origins with credentials — it is the fix, and must stay silent.
 */
ruleTester.run('lock: reflected vs validated origin', noPermissiveCors, {
  valid: [
    {
      code: `res.setHeader('Access-Control-Allow-Origin', ALLOWED.has(req.headers.origin) ? req.headers.origin : 'null');`,
    },
    { code: `res.setHeader('Access-Control-Allow-Origin', config.publicOrigin);` },
  ],
  invalid: [
    {
      code: `res.setHeader('Access-Control-Allow-Origin', req.headers.origin);`,
      errors: 1,
    },
    {
      code: `res.setHeader('Access-Control-Allow-Origin', request.headers['origin']);`,
      errors: 1,
    },
  ],
});

/** Edge shapes the folding and the header-name positions must survive. */
ruleTester.run('edge shapes', noPermissiveCors, {
  valid: [
    // Non-string literals fold to nothing.
    { code: `res.setHeader(42, '*');` },
    { code: `res.setHeader('Access-Control-Allow-Origin', 123);` },
    // A computed method name is not a proven header call.
    { code: `res[m]('Access-Control-Allow-Origin', '*');` },
    // An unresolvable binding is not a wildcard.
    { code: `res.setHeader('Access-Control-Allow-Origin', props.origin);` },
    { code: `function f(o) { res.setHeader('Access-Control-Allow-Origin', o); }` },
    // A re-assigned binding has no single knowable value.
    { code: `let o = 'https://a.example'; o = '*'; res.setHeader('Access-Control-Allow-Origin', o);` },
    // A computed key is not a header name.
    { code: `const h = { [name]: '*' };` },
    // A shorthand/identifier key that is not the header.
    { code: `const h = { origin: '*' };` },
    // `key` naming something else entirely.
    { code: `const e = { key: 'X-Frame-Options', value: '*' };` },
    // `key` with no sibling `value`.
    { code: `const e = { key: 'Access-Control-Allow-Origin' };` },
    // `key` whose sibling value is not a wildcard.
    { code: `const e = { key: 'Access-Control-Allow-Origin', value: 'https://a.example' };` },
    // A `key` property outside an object entry shape.
    { code: `const k = ['Access-Control-Allow-Origin'];` },
    // cors() with an unresolvable options argument.
    { code: `app.use(cors(options));` },
    // cors() with no origin property at all.
    { code: `app.use(cors({ credentials: true }));` },
    // cors() with a computed origin key.
    { code: `app.use(cors({ [k]: '*' }));` },
    // A non-member callee is not a header call.
    { code: `setHeader('Access-Control-Allow-Origin', '*');` },
    // `.origin` on something that is not a headers bag.
    { code: `res.setHeader('Access-Control-Allow-Origin', config.origin);` },
    // A computed non-string property is not `origin`.
    { code: `res.setHeader('Access-Control-Allow-Origin', req.headers[k]);` },
  ],
  invalid: [
    // Was pinned as valid under "`headers` reached computed is not proof of a
    // headers bag". It is exactly as much proof as `req.headers` is, and this
    // reflects the caller's own Origin — the reflection the rule exists for.
    {
      code: `res.setHeader('Access-Control-Allow-Origin', req['headers'].origin);`,
      errors: 1,
    },
    // A quoted property key, and a nested constant chain.
    { code: `const A = '*'; const B = A; res.setHeader('Access-Control-Allow-Origin', B);`, errors: 1 },
    // The header name itself reached through a constant.
    { code: `const H = 'Access-Control-Allow-Origin'; res.setHeader(H, '*');`, errors: 1 },
    // `origin: true` reflects, which is worse than the wildcard.
    { code: `app.use(cors({ origin: true }));`, errors: 1 },
    // A computed string property spelling `origin`.
    { code: `res.setHeader('Access-Control-Allow-Origin', req.headers['Origin']);`, errors: 1 },
  ],
});

/** The folds are BOUNDED. */
ruleTester.run('bounded folding', noPermissiveCors, {
  valid: [
    // Six hops past the bound: the wildcard is no longer readable.
    {
      code: `const a = '*'; const b = a; const c = b; const d = c; const e = d; const f = e; res.setHeader('Access-Control-Allow-Origin', f);`,
    },
    // The same for the cors() options object.
    {
      code: `const a = { origin: '*' }; const b = a; const c = b; const d = c; const e = d; const f = e; app.use(cors(f));`,
    },
    // Neither literal nor identifier: nothing to fold.
    { code: `app.use(cors(makeOptions()));` },
  ],
  invalid: [
    { code: `const a = '*'; const b = a; res.setHeader('Access-Control-Allow-Origin', b);`, errors: 1 },
    { code: `const a = { origin: '*' }; const b = a; app.use(cors(b));`, errors: 1 },
  ],
});

/** A property key that is neither an identifier nor a string. */
ruleTester.run('non-string property keys', noPermissiveCors, {
  valid: [{ code: `const h = { 42: '*' };` }],
  invalid: [],
});
