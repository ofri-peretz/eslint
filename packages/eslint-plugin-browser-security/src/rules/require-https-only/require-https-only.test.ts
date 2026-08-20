/**
 * @fileoverview Tests for require-https-only
 *
 * Coverage: Comprehensive test suite with valid and invalid cases
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireHttpsOnly } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('require-https-only', requireHttpsOnly, {
  valid: [
    'const x = 42;',
    'const flag = true;',
    'function noop() {}',
    'const items = [];',
    'const obj = {};',
    'class Foo {}',

    // HTTPS on both sinks, across every axios verb the rule claims.
    { code: "fetch('https://api.example.com')" },
    { code: "axios.get('https://secure.io')" },
    { code: "axios.post('https://api.stripe.com/v1/charges', body)" },
    { code: "axios.put('https://api.acme.io/users/1', patch)" },
    { code: "axios.delete('https://api.acme.io/users/1')" },
    { code: "axios.patch('https://api.acme.io/users/1', patch)" },
    { code: "axios.head('https://cdn.acme.io/asset.js')" },
    { code: "axios.options('https://api.acme.io/users')" },

    // Relative and protocol-relative URLs choose no scheme of their own.
    { code: "fetch('/api/orders')" },
    { code: "fetch('//cdn.acme.io/lib.js')" },

    // ---- FP lock -----------------------------------------------------------
    // A dev server never leaves the machine, and RFC 2606 reserves
    // example.com. Every sibling CWE-319 rule in this package carves these
    // out; this one reported them, so the same dev URL was a HIGH finding
    // here and silent next door.
    { code: "fetch('http://localhost:3000/api')" },
    { code: "fetch('http://127.0.0.1:8080/health')" },
    { code: "axios.get('http://0.0.0.0:5000/status')" },
    { code: "fetch('http://example.com')" },
    { code: "fetch('http://app.localhost:4000')" },
    { code: "fetch('http://fixtures.test/data.json')" },

    // A non-literal URL is not knowable at this point.
    { code: 'fetch(endpoint)' },
    { code: 'fetch(`${base}/orders`)' },
    // A template whose authority IS written down gets the same exemptions as
    // the literal form.
    { code: 'fetch(`http://localhost:${port}/api`)' },
    { code: 'fetch(`http://example.com/${path}`)' },
    // Not the FIRST argument, so not the request target. This rule owning
    // "a URL somewhere near a fetch" would have made `no-http-urls` defer on a
    // shape nobody then reported.
    { code: "fetch('/api', { headers: { referer: 'http://acmecorp.io' } })" },
    // `axios(...)` as a bare callable is not one of the verb methods, and a
    // computed member access is not a statically known one.
    { code: "axios({ url: 'http://api.acmecorp.io/v1' })" },
    { code: "axios[verb]('http://api.acmecorp.io/v1')" },
    // A different object that happens to expose `get`, with no axios binding
    // anywhere in the file. Nothing proves a request API, so the URL stays with
    // `no-http-urls`.
    { code: "http.get('http://api.acmecorp.io')" },
    // `top` and `parent` name a DIFFERENT window, so `parent.fetch` is a
    // cross-origin reach rather than this document's Fetch API. Treating them
    // as global aliases would be wrong in kind, not merely noisy.
    { code: "parent.fetch('http://api.acmecorp.io/v1/session')" },
    { code: "top.fetch('http://api.acmecorp.io/v1/session')" },
    // A local object that merely SPELLS a fetch-like member is not the global.
    { code: "api.fetch('http://api.acmecorp.io/v1/session')" },

    // Neither sink.
    { code: "request.get('http://api.acme.io')" },
    { code: "http.get('http://api.acme.io')" },
    { code: 'fetch()' },
  ],

  invalid: [
    { code: "fetch('http://api.example.com')", errors: [{ messageId: 'violationDetected' }] },
    { code: "axios.get('http://api.acme.io/v1')", errors: [{ messageId: 'violationDetected' }] },
    {
      code: "axios.post('http://api.acme.io/v1/orders', cart)",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "axios.put('http://api.acme.io/v1/users/1', patch)",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "axios.delete('http://api.acme.io/v1/users/1')",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "axios.patch('http://api.acme.io/v1/users/1', patch)",
      errors: [{ messageId: 'violationDetected' }],
    },
    { code: "axios.head('http://cdn.acme.io/a.js')", errors: [{ messageId: 'violationDetected' }] },
    {
      code: "axios.options('http://api.acme.io/v1/users')",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A host that merely LOOKS like loopback is a real remote host.
    {
      code: "fetch('http://localhost.acme.io/api')",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "fetch('http://example.com.attacker.io/api')",
      errors: [{ messageId: 'violationDetected' }],
    },

    // --- coverage this rule gained with ownership ---------------------------
    // Sole ownership of the call site has to be TOTAL, or `no-http-urls`
    // deferring here would be a coverage hole rather than a deduplication.
    // `no-http-urls` deliberately declines a template whose authority is fully
    // interpolated — it has no host to judge, and the shape is usually
    // dev-server config. At a `fetch` call site there is no such ambiguity: the
    // request is cleartext whatever the host resolves to. Before the partition
    // this shape was reported by NOBODY.
    {
      code: 'fetch(`http://${host}/api`)',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'fetch(`http://api.acmecorp.io/v1/${id}`)',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'axios.get(`http://${host}/v1`)',
      errors: [{ messageId: 'violationDetected' }],
    },
    // A URL assembled by concatenation is one URL being built for one call.
    {
      code: "fetch('http://api.acmecorp.io' + path)",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "axios.post('http://api.acmecorp.io/v1/' + resource, body)",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A loopback-LOOKING authority written into a template is still remote.
    {
      code: 'fetch(`http://localhost.acmecorp.io/${path}`)',
      errors: [{ messageId: 'violationDetected' }],
    },

    // --- REGRESSION: adversarial corpus wave --------------------------------
    // FN. `fetch`, `window.fetch`, `self.fetch` and `globalThis.fetch` are the
    // same function. Matching only the bare identifier made every qualified
    // spelling invisible — and `self.fetch` is the ONLY one available inside a
    // Worker, so the rule was blind to workers entirely. Found by the corpus:
    // `window.fetch('http://metrics…')` fell through to `no-http-urls`, so a
    // proven cleartext REQUEST was reported as a hardcoded string.
    {
      code: "window.fetch('http://metrics.acmecorp.io/collect')",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "self.fetch('http://api.acmecorp.io/v1/jobs')",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "globalThis.fetch('http://api.acmecorp.io/v1/jobs')",
      errors: [{ messageId: 'violationDetected' }],
    },
    // FN. The axios client bound to a different local name. A plain import
    // rename, not an exotic shape, and the rule matched the receiver's
    // SPELLING — so every codebase that calls it `http` or `client` was missed.
    {
      code: "import http from 'axios'; http.get('http://api.acmecorp.io/v1/invoices')",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "const client = require('axios'); client.post('http://api.acmecorp.io/v1', body)",
      errors: [{ messageId: 'violationDetected' }],
    },
    // FN. Schemes are ASCII case-insensitive, so this request is cleartext.
    {
      code: "fetch('HTTP://legacy.acmecorp.io/v1/report')",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

/**
 * LOCK — `writtenPrefix()` recursion terminates on the deepest input that can
 * reach it.
 *
 * The rule ledger flags this function as `unguarded-recursion`: it calls itself
 * on `node.left` with no visited-set and no depth bound. Probed, the finding is
 * a FALSE ALARM in both of the ways that matter:
 *
 * 1. It cannot CYCLE. The only recursive edge descends into `node.left` of a
 *    `+` BinaryExpression, which is strictly toward the AST leaves. The
 *    ledger's own suggested probe — `let a = b; let b = a;` — does not apply,
 *    because this function never follows a binding.
 * 2. It cannot run out of depth before the PARSER does. Measured on
 *    @typescript-eslint/parser: a `fetch()` argument concatenating ~800 string
 *    literals still lints normally and reports; at ~1000 the parser itself
 *    throws "Maximum call stack size exceeded" and the rule is never invoked.
 *
 * So no depth guard was added. Adding one would introduce a branch no input
 * this parser can produce could take — an uncoverable line in a package pinned
 * at 100% — and, if the bound were set low enough to be reachable, would turn
 * a deep concatenation into a false negative.
 *
 * 300 is used here rather than the measured 800: comfortably deeper than any
 * hand-written expression, comfortably below the parser ceiling, so a parser
 * upgrade cannot make this lock flaky.
 */
ruleTester.run('require-https-only — deep concatenation terminates', requireHttpsOnly, {
  valid: [],
  invalid: [
    {
      code: `fetch(${Array.from({ length: 300 }, () => "'http://acmecorp.io'").join(' + ')})`,
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
