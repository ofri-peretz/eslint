/**
 * Tests for no-unsafe-inline-csp rule
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnsafeInlineCsp } from './index';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const jsxTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('no-unsafe-inline-csp', noUnsafeInlineCsp, {
  valid: [
    // Safe CSP with nonce
    { name: 'a nonce instead', code: `const csp = "script-src 'self' 'nonce-abc123'";` },
    // Safe CSP with hash
    { code: `const csp = "script-src 'self' 'sha256-xxx'";` },
    // No CSP content
    { code: `const message = "Hello world";` },
    // Test files allowed
    { code: `const csp = "script-src 'unsafe-inline'";`, filename: 'csp.test.ts' },
  ],
  invalid: [
    // String literal with unsafe-inline
    {
      name: "'unsafe-inline' in the policy",
      code: `const csp = "script-src 'unsafe-inline'";`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // Multiple directives
    {
      code: `const csp = "default-src 'self'; script-src 'unsafe-inline' 'self'";`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // Template literal
    {
      code: `const csp = \`style-src 'unsafe-inline'\`;`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // In meta tag attribute
    {
      code: `const meta = { content: "script-src 'unsafe-inline'" };`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // Response header
    {
      code: `res.setHeader('Content-Security-Policy', "script-src 'unsafe-inline'");`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // Test file with allowInTests: false
    {
      code: `const csp = "script-src 'unsafe-inline'";`,
      filename: 'csp.test.ts',
      options: [{ allowInTests: false }],
      errors: [{ messageId: 'unsafeInline' }],
    },
  ],
});

// ── Shape is not meaning: the token alone is not a policy ────────────────────
ruleTester.run('a policy, not a string containing the token', noUnsafeInlineCsp, {
  valid: [
    // The token with no directive and no delivery point. A keyword table, a
    // docs example, an error message — none of these serve a policy, and the
    // rule's claim ("inline scripts will execute") is untrue of them.
    `const CSP_KEYWORDS = ["'self'", "'unsafe-inline'", "'unsafe-eval'"];`,
    `throw new Error("remove 'unsafe-inline' from your policy");`,
    "const doc = `the 'unsafe-inline' keyword defeats XSS protection`;",
    // A header setter whose header is something else entirely.
    `res.setHeader('X-Docs-Hint', "'unsafe-inline' is not allowed here");`,
    // A property key that is not a CSP name.
    `const help = { hint: "'unsafe-inline'" };`,
    // A computed property key names a variable, not a header.
    `const o = { [k]: "'unsafe-inline'" };`,
    // A numeric key is neither an identifier nor a header name.
    `const rows = { 1: "'unsafe-inline'" };`,
    // A single-argument call is not a header setter.
    `log("'unsafe-inline'");`,
    // A two-argument call whose first argument is not a string literal.
    `res.setHeader(headerName, "'unsafe-inline'");`,
  ],
  invalid: [
    // Delivered as a header, so it IS a policy even with no directive token
    // this rule recognises.
    {
      code: `res.setHeader('Content-Security-Policy-Report-Only', "'unsafe-inline'");`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // Same, as an object property in a headers map.
    {
      code: `const headers = { 'Content-Security-Policy': "'unsafe-inline'" };`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // Same, spelled as a camelCase config key.
    {
      code: `const config = { contentSecurityPolicy: "'unsafe-inline'" };`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // The short spelling frameworks use for the same option.
    {
      code: `const config = { csp: "'unsafe-inline'" };`,
      errors: [{ messageId: 'unsafeInline' }],
    },
  ],
});

// ── The regression the `g` flag caused ───────────────────────────────────────
ruleTester.run('every policy in the file reports', noUnsafeInlineCsp, {
  valid: [],
  invalid: [
    // `/…/g.test()` advances lastIndex and resumes there on the next call, so
    // the SECOND policy in a file was searched from an offset past its own
    // match and came back false. Two policies, two findings — this case fails
    // on the old code with only one error reported.
    {
      code: [
        `const a = "script-src 'unsafe-inline'";`,
        `const b = "style-src 'unsafe-inline'";`,
      ].join('\n'),
      errors: [
        { messageId: 'unsafeInline' },
        { messageId: 'unsafeInline' },
      ],
    },
    // Three in a row: the old code reported the first and third only.
    {
      code: [
        `const a = "script-src 'unsafe-inline'";`,
        `const b = "style-src 'unsafe-inline'";`,
        `const c = "img-src 'unsafe-inline'";`,
      ].join('\n'),
      errors: [
        { messageId: 'unsafeInline' },
        { messageId: 'unsafeInline' },
        { messageId: 'unsafeInline' },
      ],
    },
  ],
});

// ── Corpus sites, both kept as true positives ────────────────────────────────
ruleTester.run('corpus CSP sites', noUnsafeInlineCsp, {
  valid: [],
  invalid: [
    // okta/okta-signin-widget Gruntfile.js:267. A dev server is still a server,
    // and `'unsafe-inline'` in a served policy is the defect the rule names.
    // The localhost source in the same directive does not soften it.
    {
      code:
        'res.setHeader(\n' +
        "  'Content-Security-Policy',\n" +
        '  `script-src \'unsafe-inline\' http://localhost:${DEFAULT_SERVER_PORT}`\n' +
        ');',
      errors: [{ messageId: 'unsafeInline' }],
    },
    // okta/okta-signin-widget playground/mocks/spec-okta-api/auth/services/
    // devicefingerprint.js:24 — a mock server, but it sets a real header.
    {
      code: `res.header('Content-Security-Policy', 'script-src \\'unsafe-inline\\'');`,
      errors: [{ messageId: 'unsafeInline' }],
    },
  ],
});

// ── The meta-tag delivery point ──────────────────────────────────────────────
jsxTester.run('meta http-equiv delivers a policy', noUnsafeInlineCsp, {
  valid: [
    // `content` on a meta tag that declares something else.
    `const a = <meta httpEquiv="X-UA-Compatible" content="'unsafe-inline'" />;`,
    // A `content` attribute with no http-equiv sibling at all.
    `const b = <meta name="description" content="'unsafe-inline'" />;`,
    // An attribute that is not `content`.
    `const c = <meta httpEquiv="Content-Security-Policy" data-x="'unsafe-inline'" />;`,
    // A JSX expression container that is not inside an attribute.
    `const d = <p>{"'unsafe-inline'"}</p>;`,
  ],
  invalid: [
    {
      code: `const e = <meta httpEquiv="Content-Security-Policy" content="'unsafe-inline'" />;`,
      errors: [{ messageId: 'unsafeInline' }],
    },
    // Written as an expression container rather than a string attribute.
    {
      code: `const f = <meta httpEquiv="Content-Security-Policy" content={"'unsafe-inline'"} />;`,
      errors: [{ messageId: 'unsafeInline' }],
    },
  ],
});
