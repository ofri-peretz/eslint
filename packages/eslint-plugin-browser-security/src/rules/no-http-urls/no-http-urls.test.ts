/**
 * @fileoverview Tests for no-http-urls
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noHttpUrls } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-http-urls', noHttpUrls, {
  valid: [
    // --- XML namespace URIs are identifiers, never requests -----------------
    // The single largest false-positive shape in the corpus: 29 occurrences in
    // okta/okta-signin-widget, reported by this rule AND detect-mixed-content.
    // Rewriting one to https BREAKS the document — the namespace string is
    // compared byte-for-byte and would no longer match.
    { code: "const svg = 'http://www.w3.org/2000/svg'" },
    { code: "const xlink = 'http://www.w3.org/1999/xlink'" },
    { code: "const soap = 'http://schemas.xmlsoap.org/soap/envelope/'" },
    // Recognised by the ATTRIBUTE name too, whatever the host — `xmlns` is the
    // XML spec's own declaration syntax, so the value is an identifier by
    // position rather than by who minted it.
    { code: "const el = { xmlns: 'http://example.com/ns' }" },
    { code: "const el = { 'xmlns:custom': 'http://example.com/ns' }" },

    // HTTPS URLs
    { code: "const apiUrl = 'https://api.example.com/data'" },
    { code: "fetch('https://secure.example.com/api')" },
    // Allowed localhost
    { code: "const devUrl = 'http://localhost:3000'" },
    { code: "const localApi = 'http://127.0.0.1:8080/api'" },
    // Allowed hosts via options
    { 
      code: "const devUrl = 'http://dev.local/api'",
      options: [{ allowedHosts: ['dev.local'] }]
    },
    // Allowed ports via options
    { 
      code: "const devUrl = 'http://0.0.0.0:5000/api'",
      options: [{ allowedHosts: ['0.0.0.0'], allowedPorts: [5000] }]
    },
    // Non-URL strings
    { code: "const protocol = 'http'" },
    { code: "const x = 1" },
  ],

  invalid: [
    // The namespace allowlist is by HOST, not substring: a real request to a
    // host whose PATH mentions w3.org is still a request.
    {
      code: "fetch('http://cdn.example.com/w3.org/lib.js')",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // A non-namespace property key does not confer the exemption.
    {
      code: "const el = { href: 'http://example.com/ns' }",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // A numeric key is not a name at all, so nothing is conferred.
    {
      code: "const el = { 1: 'http://example.com/ns' }",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },

    // Insecure http URLs
    { 
      code: "const apiUrl = 'http://api.example.com/data'", 
      errors: [{ messageId: 'insecureHttpWithException' }] 
    },
    { 
      code: "fetch('http://insecure.example.com/api')", 
      errors: [{ messageId: 'insecureHttpWithException' }] 
    },
    // Template literals
    { 
      code: "const url = `http://external.com/api/${path}`", 
      errors: [{ messageId: 'insecureHttpWithException' }] 
    },
    // Without allowed hosts (uses insecureHttp message)
    { 
      code: "const url = 'http://prod.example.com/api'",
      options: [{ allowedHosts: [] }],
      errors: [{ messageId: 'insecureHttp' }] 
    },
  ],
});

// JSX is where `xmlns` actually appears in real code — every SVG icon
// component in okta/okta-signin-widget carries one. The default tester above
// has no JSX, so these paths need their own.
const jsxRuleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

jsxRuleTester.run('no-http-urls (jsx)', noHttpUrls, {
  valid: [
    // okta/okta-signin-widget src/v3/src/components/Icon/*.tsx — 29 of these.
    { code: '<svg xmlns="http://www.w3.org/2000/svg" />' },
    // The namespaced spelling of the same declaration.
    { code: '<svg xmlns:xlink="http://example.com/ns" />' },
    // JSX spells the XLink namespace this way.
    { code: '<svg xmlnsXlink="http://example.com/ns" />' },
  ],
  invalid: [
    // A non-namespace JSX attribute is an ordinary URL and still reports.
    {
      code: '<img src="http://cdn.example.com/logo.png" />',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // A spread attribute has no name to read, so no exemption is conferred.
    {
      code: '<img {...{ src: "http://cdn.example.com/a.png" }} />',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
  ],
});
