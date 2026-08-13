/**
 * Coverage-gap tests for require-dependency-integrity (dual-layer, Layer 1).
 * Targets: non-matching string literals, and every TemplateLiteral branch
 * (link/href match, non-CDN sources, integrity present).
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { requireDependencyIntegrity } from './index';

RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

describe('require-dependency-integrity coverage gaps', () => {
  ruleTester.run('require-dependency-integrity', requireDependencyIntegrity, {
    valid: [
      // Plain string literal, no script/link markup → outer check false
      { code: "const s = 'hello world';" },
      // Plain template literal, no markup → template outer check false
      { code: 'const t = `hello world`;' },
      // Template script tag from a NON-CDN source → CDN check false
      {
        code: 'const t = `<script src="https://example.com/app.js"></script>`;',
      },
      // Template CDN script WITH integrity → integrity check blocks report
      {
        code: 'const t = `<script src="https://cdn.example.com/app.js" integrity="sha384-abc"></script>`;',
      },
      // Every CDN tag protected, attributes spread over lines as they are in
      // real templates.
      {
        code: [
          'const t = `',
          '  <script',
          '    src="https://cdn.jsdelivr.net/npm/react@17/umd/react.development.js"',
          '    integrity="sha512-Vf2xGDzpqUOEIKO"',
          '    crossorigin="anonymous"',
          '  ></script>',
          '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/polaris/styles.css" integrity="sha512-abc" />',
          '`;',
        ].join('\n'),
      },
      // A `<script>` with no src is inline code, not a fetched dependency —
      // even next to a CDN URL elsewhere in the template.
      {
        code: [
          'const t = `',
          '  <link rel="stylesheet" href="/local/styles.css" />',
          '  <script>const cdn = "https://cdn.example.com";</script>',
          '`;',
        ].join('\n'),
      },
      // `<link>` without href, and a script whose URL is not a CDN.
      {
        code: 'const t = `<link rel="preconnect"><script src="/local/app.js"></script>`;',
      },
    ],
    invalid: [
      // Template <link href=...> from a CDN without integrity → reported
      {
        code: 'const t = `<link href="https://cdn.example.com/style.css">`;',
        errors: [{ messageId: 'violationDetected' }],
      },
      // --- One protected tag must not vouch for its neighbours -------------
      // Corpus: Shopify/cli
      // packages/cli-kit/src/public/node/graphiql/templates/graphiql.tsx —
      // two React bundles carry `integrity="sha512-…"`, and the old
      // per-template check let their presence suppress the unprotected
      // graphiql.min.js in the same string. The rule reported NOTHING on the
      // file it exists to catch.
      {
        code: [
          'const t = `',
          '  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@shopify/polaris@12.10.0/build/esm/styles.css" />',
          '  <script',
          '    src="https://cdn.jsdelivr.net/npm/react@17/umd/react.development.js"',
          '    integrity="sha512-Vf2xGDzpqUOEIKO"',
          '    crossorigin="anonymous"',
          '  ></script>',
          '  <script',
          '    src="https://cdn.jsdelivr.net/npm/graphiql@3.0.4/graphiql.min.js"',
          '    type="application/javascript"',
          '  ></script>',
          '`;',
        ].join('\n'),
        errors: [{ messageId: 'violationDetected' }],
      },
      // The same suppression through a plain string literal.
      {
        code:
          'const s = \'<script src="https://cdn.a/x.js" integrity="sha384-a"></script><script src="https://cdn.a/y.js"></script>\';',
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  });
});
