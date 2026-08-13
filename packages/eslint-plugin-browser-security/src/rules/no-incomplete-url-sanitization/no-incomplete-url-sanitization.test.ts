/**
 * @fileoverview Tests for no-incomplete-url-sanitization
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noIncompleteUrlSanitization } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run(
  'no-incomplete-url-sanitization',
  noIncompleteUrlSanitization,
  {
    valid: [
      // ── Corpus locks: benchmarks/corpus/CWE-020/safe/*.js ────────────────
      // benchmarks/corpus/CWE-020/safe/endswith-boundary.js
      {
        code: `
          function isTrustedSubdomain(hostname) {
            const host = String(hostname).toLowerCase().split(':')[0];
            return host === 'trusted.com' || host.endsWith('.trusted.com');
          }
        `,
      },
      // benchmarks/corpus/CWE-020/safe/url-parse-hostname.js
      {
        code: `
          function isTrustedApi(url) {
            try {
              return new URL(url).hostname === 'trusted.com';
            } catch (err) {
              return false;
            }
          }
        `,
      },
      // benchmarks/corpus/CWE-020/safe/scheme-allowlist.js
      {
        code: `
          const ALLOWED_PROTOCOLS = ['http:', 'https:'];
          function sanitizeHref(raw) {
            try {
              const parsed = new URL(raw, window.location.origin);
              return ALLOWED_PROTOCOLS.includes(parsed.protocol) ? parsed.href : '#';
            } catch (err) {
              return '#';
            }
          }
        `,
      },

      // ── isHostLikeLiteral: what is NOT a host ────────────────────────────
      // A path turns it into a prefix check, a different shape.
      { code: "if (url.includes('example.com/login')) { go(); }" },
      // Single label — no host to be fooled about.
      { code: "if (url.includes('localhost')) { go(); }" },
      // Underscores are not host label characters.
      { code: "if (url.includes('exa_mple.com')) { go(); }" },
      // `.json` is a file extension, not a TLD — this is the noise the closed
      // TLD list exists to keep out.
      { code: "if (url.includes('package.json')) { go(); }" },
      // A colon that is not a port.
      { code: "if (url.includes('example.com:notaport')) { go(); }" },
      // Credentials in the literal.
      { code: "if (url.includes('user@example.com')) { go(); }" },

      // ── Receiver is not known to hold a URL ──────────────────────────────
      { code: "if (body.includes('trusted.com')) { go(); }" },
      { code: "if (map['url'].includes('trusted.com')) { go(); }" },
      { code: "if (getUrl().includes('trusted.com')) { go(); }" },
      { code: "if (String().includes('trusted.com')) { go(); }" },
      { code: "if ((a + b).includes('trusted.com')) { go(); }" },

      // ── indexOf is only containment once compared against -1 / 0 ─────────
      { code: "log(url.indexOf('trusted.com'));" },
      { code: "if (url.indexOf('trusted.com') === -1) { deny(); }" },
      { code: "if (url.indexOf('trusted.com') > 0) { go(); }" },
      { code: "if (url.indexOf('trusted.com') >= 1) { go(); }" },
      { code: "if (url.indexOf('trusted.com') !== someVar) { go(); }" },
      { code: "if (url.indexOf('trusted.com') !== +1) { go(); }" },
      { code: "if (url.indexOf('trusted.com') !== -someVar) { go(); }" },
      { code: "if (url.indexOf('trusted.com') !== 'x') { go(); }" },
      // A genuine suffix check — the thing `lastIndexOf` is *supposed* to do.
      {
        code: "if (host.lastIndexOf('.trusted.com') === host.length - 13) { go(); }",
      },
      // Positional second argument means this is not a plain containment test.
      { code: "if (url.indexOf('trusted.com', 5) !== -1) { go(); }" },
      // Containment, but nothing branches on it.
      { code: "track(url.indexOf('trusted.com') !== -1);" },
      // Containment in a guard, but the receiver is not known to be a URL.
      { code: "if (body.indexOf('trusted.com') !== -1) { go(); }" },

      // ── Not a decision ───────────────────────────────────────────────────
      { code: "track(url.includes('trusted.com'));" },
      { code: "const label = x ? url.includes('trusted.com') : 'n';" },
      { code: "for (url.includes('trusted.com'); i < 3; i++) { go(); }" },
      { code: "const t = typeof url.includes('trusted.com');" },

      // ── Needle is not a host string ──────────────────────────────────────
      { code: "if (url.includes(host)) { go(); }" },
      { code: "if (url.includes(42)) { go(); }" },

      // ── Scheme denylist: complete, or not a denylist at all ──────────────
      {
        code: `
          function sanitize(href) {
            if (href.startsWith('javascript:')) return '#';
            if (href.startsWith('data:')) return '#';
            return href;
          }
        `,
      },
      // A lone data: test is feature detection, not sanitisation.
      {
        code: `
          function isInlineImage(src) {
            return src.startsWith('data:');
          }
        `,
      },
      { code: "function f(href) { return href.replace('javascript:', ''); }" },
      { code: "function f(href) { return href.startsWith(); }" },
      { code: "function f(href, p) { return href.startsWith(p); }" },
      { code: "function f(href) { return href.startsWith('https://a.example'); }" },
      { code: "function f(href) { return /^foo/.test(href); }" },
      { code: "function f(href, re) { return re.test(href); }" },
      { code: "function f(href) { foo(href.startsWith('javascript:')); }" },
      { code: "function f(n) { return n === 42; }" },
      { code: "function f(a, b) { return a > b; }" },
      { code: "function f(p) { return p > 'javascript:'; }" },
    ],

    invalid: [
      // ── Corpus lock: benchmarks/corpus/CWE-020/vulnerable/
      //    url-substring-sanitization.js ───────────────────────────────────
      {
        code: `
          function isTrustedApi(url) {
            return url.includes('trusted.com') || url.indexOf('trusted.com') !== -1;
          }
        `,
        errors: [
          { messageId: 'substringHostCheck' },
          { messageId: 'substringHostCheck' },
        ],
      },
      // ── Corpus lock: benchmarks/corpus/CWE-020/vulnerable/
      //    incorrect-suffix-check.js ────────────────────────────────────────
      {
        code: `
          function isTrustedSubdomain(hostname) {
            return hostname.lastIndexOf('.trusted.com') !== -1;
          }
        `,
        errors: [{ messageId: 'substringHostCheck' }],
      },
      // ── Corpus lock: benchmarks/corpus/CWE-020/vulnerable/
      //    incomplete-url-scheme-check.js ───────────────────────────────────
      {
        code: `
          function sanitizeHref(raw) {
            const value = String(raw).trim().toLowerCase();
            if (value.startsWith('javascript:')) {
              return '#';
            }
            return raw;
          }
        `,
        errors: [{ messageId: 'incompleteSchemeDenylist' }],
      },

      // ── Host literal shapes ──────────────────────────────────────────────
      {
        code: "if (url.includes('https://app.example.com')) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "if (url.includes('//example.com')) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "if (url.includes('example.com:8443')) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "if (url.includes('  trusted.com  ')) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },

      // ── Receiver evidence ────────────────────────────────────────────────
      {
        code: "function f(req) { if (req.headers.host.includes('trusted.com')) { go(); } }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "if (href.toLowerCase().includes('trusted.com')) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "if (String(rawUrl).includes('trusted.com')) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      // Not named for a URL, but taint says an attacker chose it.
      {
        code: "if (location.hash.includes('trusted.com')) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },

      // ── Containment comparisons ──────────────────────────────────────────
      {
        code: "if (url.indexOf('trusted.com') != -1) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "if (url.indexOf('trusted.com') > -1) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "if (url.indexOf('trusted.com') >= 0) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "if (-1 !== url.indexOf('trusted.com')) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "if (-1 < url.indexOf('trusted.com')) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },

      // ── Decision positions ───────────────────────────────────────────────
      {
        code: "while (url.includes('trusted.com')) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "do { go(); } while (url.includes('trusted.com'));",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "const ok = url.includes('trusted.com');",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "const v = url.includes('trusted.com') ? 1 : 2;",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "for (; url.includes('trusted.com'); ) { go(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "if (!url.includes('trusted.com')) { deny(); }",
        errors: [{ messageId: 'substringHostCheck' }],
      },
      {
        code: "const p = () => url.includes('trusted.com');",
        errors: [{ messageId: 'substringHostCheck' }],
      },

      // ── Scheme denylist shapes ───────────────────────────────────────────
      // Module scope, not inside any function.
      {
        code: "if (href.startsWith('javascript:')) { block(); }",
        errors: [{ messageId: 'incompleteSchemeDenylist' }],
      },
      {
        code: "const f = function (href) { if (href.startsWith('javascript:')) { block(); } };",
        errors: [{ messageId: 'incompleteSchemeDenylist' }],
      },
      {
        code: "const f = (href) => href.startsWith('javascript:');",
        errors: [{ messageId: 'incompleteSchemeDenylist' }],
      },
      {
        code: "function f(href) { if (/^javascript:/i.test(href)) { block(); } }",
        errors: [{ messageId: 'incompleteSchemeDenylist' }],
      },
      {
        code: "function f(p) { if (p === 'javascript:') { block(); } }",
        errors: [{ messageId: 'incompleteSchemeDenylist' }],
      },
      {
        code: "function f(p) { if ('javascript:' === p) { block(); } }",
        errors: [{ messageId: 'incompleteSchemeDenylist' }],
      },
      {
        code: "function f(p) { if (p === ' javascript: ') { block(); } }",
        errors: [{ messageId: 'incompleteSchemeDenylist' }],
      },
      {
        code: "function f(href) { if (href.indexOf('javascript:') !== -1) { block(); } }",
        errors: [{ messageId: 'incompleteSchemeDenylist' }],
      },
      // vbscript: is covered, data: is not — still incomplete.
      {
        code: `
          function sanitize(href) {
            if (href.startsWith('javascript:')) return '#';
            if (href.startsWith('vbscript:')) return '#';
            return href;
          }
        `,
        errors: [{ messageId: 'incompleteSchemeDenylist' }],
      },
      // Two javascript: tests in one function are one incomplete denylist.
      {
        code: `
          function sanitize(href) {
            if (href.startsWith('javascript:')) return '#';
            if (href.includes('javascript:')) return '#';
            return href;
          }
        `,
        errors: [{ messageId: 'incompleteSchemeDenylist' }],
      },
    ],
  },
);
