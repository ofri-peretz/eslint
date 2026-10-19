/**
 * Mutation-survivor kill fixtures for no-incomplete-url-sanitization.
 *
 * Each case pins a decision Stryker showed was free to drift: the host-literal
 * shape test, the receiver-name passthroughs, the indexOf comparison reading,
 * the per-function scope of a scheme denylist, and which node the report lands on.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noIncompleteUrlSanitization } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-incomplete-url-sanitization', noIncompleteUrlSanitization, {
  valid: [
    // ── isHostLikeLiteral: the strip regexes are anchored ──────────────────
    {
      name: 'a scheme in the middle of the needle is not stripped into a host',
      code: "function ok(url) { return url.includes('foohttp:.com'); }",
    },
    {
      name: 'a trailing // is not stripped — the needle carries a path',
      code: "function ok(url) { return url.includes('trusted.com//'); }",
    },
    {
      name: 'a port in the middle of the needle is not stripped into a host',
      code: "function ok(url) { return url.includes('trusted:8080.com'); }",
    },
    {
      name: 'a single label that happens to be a TLD is not a host',
      code: "function ok(href) { return href.includes('link'); }",
    },

    // ── receiverName: only the listed String methods pass the name through ─
    {
      name: 'an array filtered then searched does not inherit the name of the array',
      code: "function ok(hosts) { return hosts.filter(Boolean).includes('trusted.com'); }",
    },
    {
      name: 'only String(x) passes its argument name through — other calls do not',
      code: "function ok(urlPath) { return readFile(urlPath).includes('example.com'); }",
    },

    // ── isContainmentComparison ─────────────────────────────────────────────
    {
      name: 'indexOf returned from an arrow (not compared) is a position, not a containment test',
      code: "const where = (url) => url.indexOf('trusted.com');",
    },
    {
      name: 'indexOf !== 0 is a "not a prefix" test, not containment',
      code: "function ok(url) { if (url.indexOf('trusted.com') !== 0) deny(); }",
    },
    {
      name: 'a comparison method that is not a substring search is not a host check',
      code: "function ok(origin) { return origin.localeCompare('trusted.com') !== -1; }",
    },

    // ── scheme denylist ─────────────────────────────────────────────────────
    {
      name: 'data:text/html is a data: denial — a scheme is matched at the start of the needle',
      code: `
        function sanitize(u) {
          if (u.toLowerCase().startsWith('javascript:') || u.startsWith('data:text/html')) return '';
          return u;
        }
      `,
    },
    {
      name: 'a function that only denies vbscript: never denied javascript:, so it is not this finding',
      code: "function sanitize(h) { if (h.startsWith('vbscript:')) return ''; return h; }",
    },
  ],
  invalid: [
    {
      name: 'an http:// origin is stripped to its host like an https:// one',
      code: "function ok(url) { return url.includes('http://trusted.com'); }",
      errors: [{ messageId: 'substringHostCheck' }],
    },
    {
      name: 'each kind of function is its own denylist scope — module-level data: covers none of them',
      code: `
function a(h) { if (h.startsWith('javascript:')) return ''; return h; }
const b = function (h) { if (h.startsWith('javascript:')) return ''; return h; };
const c = (h) => { if (h.startsWith('javascript:')) return ''; return h; };
if (src.startsWith('data:')) { inline(); }
      `,
      errors: [
        { messageId: 'incompleteSchemeDenylist', line: 2 },
        { messageId: 'incompleteSchemeDenylist', line: 3 },
        { messageId: 'incompleteSchemeDenylist', line: 4 },
      ],
    },
    {
      name: 'the report lands on the javascript: test, not on an earlier vbscript: test',
      code: `function s(h) {
  if (h.startsWith('vbscript:')) return '';
  if (h.startsWith('javascript:')) return '';
  return h;
}`,
      errors: [{ messageId: 'incompleteSchemeDenylist', line: 3 }],
    },
    {
      name: 'the report lands on the first javascript: test of the function',
      code: `function s(h) {
  if (h.startsWith('javascript:')) return '';
  if (h.includes('javascript:')) return '';
  return h;
}`,
      errors: [{ messageId: 'incompleteSchemeDenylist', line: 2 }],
    },
    {
      name: 'lastIndexOf(javascript:, 0) === 0 is a javascript: denial',
      code: "function s(href) { if (href.lastIndexOf('javascript:', 0) === 0) return '#'; return href; }",
      errors: [{ messageId: 'incompleteSchemeDenylist' }],
    },
    {
      name: 'building a data: URL with concat is not testing for data:',
      code: "function s(h, body) { if (h.startsWith('javascript:')) return ''; return 'data:text/plain,'.concat(body); }",
      errors: [{ messageId: 'incompleteSchemeDenylist' }],
    },
    {
      name: 'protocol !== javascript: is a javascript: denial',
      code: "function s(url) { if (url.protocol !== 'javascript:') { return url.href; } return '#'; }",
      errors: [{ messageId: 'incompleteSchemeDenylist' }],
    },
  ],
});
