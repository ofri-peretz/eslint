/**
 * @fileoverview Tests for detect-mixed-content
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectMixedContent } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('detect-mixed-content', detectMixedContent, {
  valid: [
        'const x = 42;',
        'const flag = true;',
        'function noop() {}',
        'const items = [];',
        'const obj = {};',
    // HTTPS URLs are safe
    { code: "const url = 'https://example.com/api'" },
    { code: "fetch('https://cdn.example.com/lib.js')" },
    // Non-URL code
    { code: "const x = 1" },

    // --- XML namespace URIs are identifiers, never requests -----------------
    // 29 occurrences in okta/okta-signin-widget alone, reported by this rule
    // AND no-http-urls, so 58 corpus findings from one misunderstanding.
    // "Fixing" one to https BREAKS the document: the namespace no longer
    // matches what the parser expects.
    { code: "const svg = 'http://www.w3.org/2000/svg'" },
    { code: "const xhtml = 'http://www.w3.org/1999/xhtml'" },
    { code: "const xlink = 'http://www.w3.org/1999/xlink'" },
    { code: "const soap = 'http://schemas.xmlsoap.org/soap/envelope/'" },
    { code: "const oidc = { 'http://schemas.openid.net/event/backchannel-logout': {} }" },

    // --- Loopback is a secure context, so it cannot be mixed content --------
    // Per the Secure Contexts spec a loopback origin is potentially
    // trustworthy, so no browser blocks or flags it from an HTTPS page.
    // Every corpus hit was webpack dev-server or e2e fixture config.
    { code: "const base = 'http://localhost:3000'" },
    { code: "const base = 'http://127.0.0.1:8080/api'" },
    { code: "const base = 'http://0.0.0.0:5000'" },
    { code: "const base = 'http://app.localhost:3000'" },
  ],

  invalid: [
    // The allowlist is by HOST, not substring: a real request to a host whose
    // PATH mentions w3.org is still a request.
    {
      code: "fetch('http://cdn.example.com/w3.org/lib.js')",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A loopback-looking hostname that is not loopback.
    {
      code: "const base = 'http://localhost.evil.com/api'",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Starts with http:// but is not a parseable URL, so neither exemption can
    // vouch for it. Both guards must fail closed, not throw.
    {
      code: "const base = 'http://'",
      errors: [{ messageId: 'violationDetected' }],
    },
    // HTTP URLs in HTTPS context
    { code: "const url = 'http://example.com/image.png'", errors: [{ messageId: 'violationDetected' }] },
  ],
});

const jsxRuleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

jsxRuleTester.run('detect-mixed-content (jsx)', detectMixedContent, {
  valid: [
    { code: '<svg xmlns="http://www.w3.org/2000/svg" />' },
  ],
  invalid: [
    {
      code: '<img src="http://cdn.example.com/logo.png" />',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
