/**
 * @fileoverview Tests for detect-mixed-content
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { detectMixedContent } from './index';

/*
 * Fixture hosts deliberately avoid `example.com`. RFC 2606 reserves it precisely so that
 * nothing treats it as a real endpoint, and these rules now exempt it — a placeholder
 * domain cannot be a cleartext-transmission risk. Using it as a stand-in for "some remote
 * host" would test the exemption, not the rule.
 */

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
    { code: "const url = 'https://acmecorp.io/api'" },
    { code: "fetch('https://cdn.acmecorp.io/lib.js')" },
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
      code: "fetch('http://cdn.acmecorp.io/w3.org/lib.js')",
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
    { code: "const url = 'http://acmecorp.io/image.png'", errors: [{ messageId: 'violationDetected' }] },
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
      code: '<img src="http://cdn.acmecorp.io/logo.png" />',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ── The parsing base whose origin is thrown away ─────────────────────────────
// Shared with `no-http-urls` via `isDiscardedUrlBase`. This was the single
// corpus site both rules reported — the duplicate that prompted the partition.
ruleTester.run('detect-mixed-content (URL parsing base)', detectMixedContent, {
  valid: [
    // Shopify/cli packages/theme/src/cli/utilities/theme-environment/
    // server-utils.ts:4. Nothing is ever fetched from `e.c`, so it cannot be
    // mixed content.
    "const {pathname, search, searchParams} = new URL(event.path, 'http://e.c');",
  ],
  invalid: [
    // A base whose origin survives is a real cleartext endpoint.
    {
      code: "const {origin} = new URL(p, 'http://prod.acmecorp.io');",
      errors: [{ messageId: 'violationDetected' }],
    },
    // FN GUARD: the URL object is kept and can be fetched.
    {
      code: "fetch(new URL('/api', 'http://prod.acmecorp.io'));",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
