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
  ],
});
