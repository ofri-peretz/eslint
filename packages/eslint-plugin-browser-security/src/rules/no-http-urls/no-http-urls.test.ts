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

    // --- Interpolated authority: not a HARDCODED URL ------------------------
    // 5 of the 8 remaining corpus findings. Each reports on the old code with
    // the message `Hardcoded HTTP URL detected: "http://"` — a claim that is
    // false about the code and impossible to act on, because the host that
    // `allowedHosts` exists to check is not written down anywhere.

    // okta-signin-widget src/v3/webpack.dev.config.ts:158 — dev-server proxy.
    { code: 'const proxy = { target: `http://${HOST}:${MOCK_SERVER_PORT}` };' },
    // Shopify/cli theme dev server — services/dev.ts:121-122.
    { code: 'const urls = { local: `http://${host}:${port}` };' },
    { code: 'const p = `http://${host}:${port}/gift_cards/[store_id]/preview`;' },
    // theme-environment/proxy.ts:196 and theme-environment.ts:136.
    { code: 'const newBaseUrl = `http://${ctx.options.host}:${ctx.options.port}`;' },

    // --- Loopback, via the helper detect-mixed-content already uses ---------
    // Potentially trustworthy per the Secure Contexts spec; the allowedHosts
    // default (`localhost`, `127.0.0.1`) misses every one of these spellings.
    { code: "const u = 'http://[::1]:8080/health'" },
    { code: "const u = 'http://app.localhost:3000/'" },
    { code: "const u = 'http://0.0.0.0:8080/'" },
  ],

  invalid: [
    // --- FN locks for the interpolated-authority narrowing ------------------
    // A host that IS written down is still judged, however much of the rest of
    // the URL is interpolated.
    {
      code: 'const u = `http://api.example.com/${path}`;',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // Only a FULLY interpolated authority is unknowable — `api.` already
    // proves the host is not loopback.
    {
      code: 'const u = `http://api.${env}.example.com/x`;',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // A lone `http://` with no chunk after it is not an interpolation.
    {
      code: 'const u = `http://`;',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // A trailing chunk that merely *contains* an interpolation before the path
    // delimiter is still the authority — the exemption is not contagious.
    {
      code: 'const u = `http://evil.example.com?next=${target}`;',
      errors: [{ messageId: 'insecureHttpWithException' }],
    },

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

// ── The parsing base whose origin is thrown away ─────────────────────────────
// Shared with `detect-mixed-content` via `isDiscardedUrlBase`, so the two rules
// cannot disagree about this site.
ruleTester.run('no-http-urls (URL parsing base)', noHttpUrls, {
  valid: [
    // Shopify/cli packages/theme/src/cli/utilities/theme-environment/
    // server-utils.ts:4 — the one site both this rule and detect-mixed-content
    // reported. `e.c` is not a host anything resolves; it exists to satisfy the
    // URL constructor, and the origin is destructured away on the same line.
    "const {pathname, search, searchParams} = new URL(event.path, 'http://e.c');",
    // Every origin-independent part, in any combination.
    "const {hash} = new URL(p, 'http://e.c');",
    "const {pathname} = new URL(p, 'http://e.c');",
  ],
  invalid: [
    // A base whose origin SURVIVES is a real cleartext endpoint. Reading
    // `origin` keeps the scheme, so the exemption must not apply.
    {
      code: "const {origin, pathname} = new URL(p, 'http://prod.example.com');",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    {
      code: "const {href} = new URL(p, 'http://prod.example.com');",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // A rest element captures whatever is left, including the origin.
    {
      code: "const {pathname, ...rest} = new URL(p, 'http://prod.example.com');",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // A computed key cannot be read, so nothing is proven.
    {
      code: "const {[k]: v} = new URL(p, 'http://prod.example.com');",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // FN GUARD: the whole URL object is kept and can be fetched. This is the
    // case a position-only exemption would have silenced.
    {
      code: "const u = new URL('/api', 'http://prod.example.com'); fetch(u);",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // FN GUARD: passed straight to fetch, never bound at all.
    {
      code: "fetch(new URL('/api', 'http://prod.example.com'));",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // The literal is the URL itself (argument 0), not the base.
    {
      code: "const {pathname} = new URL('http://prod.example.com/a');",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // A different constructor confers nothing.
    {
      code: "const {pathname} = new Request(p, 'http://prod.example.com');",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // A member-expression callee is not the bare `URL` identifier.
    {
      code: "const {pathname} = new global.URL(p, 'http://prod.example.com');",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // Destructured into an array pattern, not an object pattern.
    {
      code: "const [a] = new URL(p, 'http://prod.example.com');",
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
  ],
});
