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

/**
 * Regression lock — six defects the benchmark corpus proved, all of them from
 * the same root cause: the rule decided from SUBSTRINGS of the tag text
 * instead of from the tag's attributes and the URL's host.
 *
 * False negatives (each one the exact markup of a case the rule already
 * reported, spelled the way real templates spell it):
 *   1. The CDN host reached the tag through a `const`, so the SOURCE text of
 *      the template read `${CDN_BASE}` and matched no known host.
 *   2. `data-integrity="…"` — build-pipeline bookkeeping the browser ignores
 *      entirely — satisfied `tag.includes('integrity=')`, so a half-finished
 *      SRI migration silenced the finding that would have flagged it.
 *   3. An attribute value containing `>` (a CDN retry handler) split the tag
 *      at that `>`, leaving the `src` in the discarded half.
 *
 * False positives (markup with NO remediation available, which is the
 * expensive kind — a reader cannot make the report go away):
 *   4. `rel="preconnect"` / `rel="dns-prefetch"` fetch no bytes.
 *   5. `rel="icon"` / `rel="manifest"` are destinations SRI does not cover.
 *   6. `/assets/cdn.fallback.js` is a same-origin file whose NAME contains
 *      `cdn.`; there is no third party in the request at all.
 */
describe('require-dependency-integrity — corpus regressions', () => {
  ruleTester.run('require-dependency-integrity', requireDependencyIntegrity, {
    valid: [
      // Resource hints and non-SRI destinations: no bytes, or no coverage.
      { code: 'const t = `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>`;' },
      { code: 'const t = `<link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">`;' },
      { code: 'const t = `<link rel="icon" href="https://cdn.example.com/favicon.ico">`;' },
      { code: 'const t = `<link rel="manifest" href="https://cdn.example.com/app.webmanifest">`;' },
      { code: 'const t = `<link rel="preload" as="image" href="https://cdn.example.com/hero.avif">`;' },
      // `preload` with no `as` is invalid markup the browser never fetches.
      { code: 'const t = `<link rel="preload" href="https://cdn.jsdelivr.net/x.js">`;' },
      // Same-origin paths whose text merely contains a CDN fragment.
      { code: 'const t = `<script src="/assets/cdn.fallback.js"></script>`;' },
      { code: 'const t = `<link rel="stylesheet" href="/css/cdn.overrides.css">`;' },
      { code: "const s = '<script src=\"./vendor/unpkg.bundle.js\"></script>';" },
      // A tag with no URL fetches nothing.
      { code: 'const t = `<script>window.__CDN__ = "https://cdn.jsdelivr.net";</script>`;' },
      { code: 'const t = `<link rel="stylesheet">`;' },
      // Protected, with the hash in an unquoted and a single-quoted attribute.
      { code: "const t = `<script src=https://cdn.jsdelivr.net/x.js integrity=sha384-a></script>`;" },
      { code: "const s = '<link rel=\"modulepreload\" href=\"https://cdn.jsdelivr.net/x.js\" integrity=\"sha384-a\">';" },
      { code: "const t = `<link rel='preload' as='style' href='https://cdn.jsdelivr.net/x.css' integrity='sha384-a'>`;" },
      // A first-party host that is not a CDN.
      { code: 'const t = `<script src="https://app.example.com/js/vendor.js"></script>`;' },
      // A resolvable const that is NOT a CDN, and an unresolvable expression:
      // neither may manufacture a host.
      { code: 'const BASE = "https://app.example.com"; const t = `<script src="${BASE}/app.js"></script>`;' },
      { code: 'const t = `<script src="${runtimeBase}/app.js"></script>`;' },
    ],
    invalid: [
      // 1. The host arrives through a `const`.
      {
        code: 'const CDN = "https://cdn.jsdelivr.net/npm"; const t = `<script src="${CDN}/chart.js"></script>`;',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: 'const CDN = "https://unpkg.com"; const t = `<link rel="stylesheet" href="${CDN}/pico.css">`;',
        errors: [{ messageId: 'violationDetected' }],
      },
      // 2. `data-integrity` is not `integrity`.
      {
        code: 'const t = `<script src="https://cdn.jsdelivr.net/dayjs.js" data-integrity="sha384-a"></script>`;',
        errors: [{ messageId: 'violationDetected' }],
      },
      // 3. A `>` inside a quoted attribute value does not end the tag.
      {
        code: 'const t = `<script onerror="if (tries > 0) retry()" src="https://cdn.jsdelivr.net/lodash.js"></script>`;',
        errors: [{ messageId: 'violationDetected' }],
      },
      // A protocol-relative URL reaches the same third party.
      {
        code: 'const t = `<script src="//cdn.jsdelivr.net/npm/htmx.js"></script>`;',
        errors: [{ messageId: 'violationDetected' }],
      },
      // The SRI-eligible `<link>` relations, unprotected.
      {
        code: 'const t = `<link rel="modulepreload" href="https://cdn.jsdelivr.net/x.js">`;',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: 'const t = `<link rel="preload" as="script" href="https://cdn.jsdelivr.net/x.js">`;',
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        code: 'const t = `<link rel="stylesheet preload" as="style" href="https://cdn.jsdelivr.net/x.css">`;',
        errors: [{ messageId: 'violationDetected' }],
      },
      // Self-closing, and an unquoted attribute value.
      {
        code: 'const t = `<link rel=stylesheet href=https://cdn.jsdelivr.net/x.css />`;',
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  });
});
