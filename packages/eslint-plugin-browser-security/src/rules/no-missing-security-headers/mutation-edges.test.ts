/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 *
 * Each case pins a branch no other fixture told apart from its mutant. The
 * `FN:` / `FP:` cases are wrong verdicts the triage found: they fail on the
 * rule as it was before this file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import { noMissingSecurityHeaders } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const ALL = `res.setHeader('Content-Security-Policy', "default-src 'self'"); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('X-Content-Type-Options', 'nosniff');`;
const ONLY_FRAME = `res.setHeader('X-Frame-Options', 'DENY');`;

const missing = (headers: string) => [
  { messageId: 'missingSecurityHeader' as const, data: { headers } },
];
const missingCspAndNosniff = missing(
  'Content-Security-Policy, X-Content-Type-Options',
);

ruleTester.run(
  'no-missing-security-headers — mutation edges',
  noMissingSecurityHeaders,
  {
    valid: [
      {
        name: 'a test file is skipped by default',
        code: ONLY_FRAME,
        filename: 'handler.test.ts',
      },
      {
        name: 'a header name computed by a call is unknowable',
        code: `res.setHeader(getName(), 'v');`,
      },
      {
        name: 'an element of a call result is unknowable',
        code: `res.setHeader(getTable()[0], 'v');`,
      },
      {
        name: 'a non-canonical string index names no element',
        code: `const H = ['X-Frame-Options']; res.setHeader(H['01'], 'DENY');`,
      },
      {
        name: 'an empty ResponseInit header block names nothing to judge',
        code: `new Response(html, { headers: {} });`,
      },
      {
        name: 'an empty Next.js header list names nothing to judge',
        code: `const c = { headers: [] };`,
      },
      {
        name: 'an init passed to a computed factory call is not a ResponseInit',
        code: `createResponder()(html, { headers: { 'X-Frame-Options': 'DENY' } });`,
      },
    ],
    invalid: [
      // ── each function is its own scope, judged once ──────────────────────
      {
        name: 'each function declaration is its own header scope',
        code: `function a(res) { ${ALL} }\nfunction b(res) { ${ONLY_FRAME} }`,
        errors: missingCspAndNosniff,
      },
      {
        name: 'each function expression is its own header scope',
        code: `const a = function (res) { ${ALL} };\nconst b = function (res) { ${ONLY_FRAME} };`,
        errors: missingCspAndNosniff,
      },
      {
        name: 'each arrow function is its own header scope',
        code: `const a = (res) => { ${ALL} };\nconst b = (res) => { ${ONLY_FRAME} };`,
        errors: missingCspAndNosniff,
      },
      {
        name: 'two handlers that each miss headers are each reported',
        code: `function a(res) { ${ONLY_FRAME} }\nfunction b(res) { ${ONLY_FRAME} }`,
        errors: [...missingCspAndNosniff, ...missingCspAndNosniff],
      },
      {
        name: 'a scope with several header calls is reported once',
        code: `function a(res) { ${ONLY_FRAME} res.setHeader('Vary', 'Accept'); }`,
        errors: missingCspAndNosniff,
      },
      // ── what counts as setting a header ──────────────────────────────────
      {
        name: 'reading a header with res.get does not set it',
        code: `${ONLY_FRAME} const csp = res.get('Content-Security-Policy');`,
        errors: missingCspAndNosniff,
      },
      {
        name: 'a map set with an unreadable key is not a header and hides nothing',
        code: `${ONLY_FRAME} cache.set(key, value);`,
        errors: missingCspAndNosniff,
      },
      {
        name: 'a set call with no arguments names no header',
        code: `${ONLY_FRAME} flag.set();`,
        errors: missingCspAndNosniff,
      },
      {
        name: 'a new expression passes its header name like a call',
        code: `function setH(res, name) { res.setHeader(name, 'v'); }\nnew setH(res, 'X-Frame-Options');`,
        errors: missingCspAndNosniff,
      },
      {
        // @found mutation testing
        name: 'FN: a string index reads the same table element as the number',
        code: `const H = ['X-Frame-Options']; res.setHeader(H['0'], 'DENY');`,
        errors: missingCspAndNosniff,
      },
      // ── what makes a response a document ─────────────────────────────────
      {
        name: 'a media type padded before its parameters is still a document',
        code: `res.setHeader('Content-Type', 'text/html ; charset=utf-8'); ${ONLY_FRAME}`,
        errors: missingCspAndNosniff,
      },
      {
        name: 'a cookie beside a document header does not make the response a non-document',
        code: `res.setHeader('Set-Cookie', 'a=1'); ${ONLY_FRAME}`,
        errors: missingCspAndNosniff,
      },
      // ── header blocks declared as data ───────────────────────────────────
      {
        // @found mutation testing
        name: 'FN: a bracketed headers key is the same response header block',
        code: `new Response(html, { ['headers']: { 'X-Frame-Options': 'DENY' } });`,
        errors: missingCspAndNosniff,
      },
      {
        // @found mutation testing
        name: 'FN: a bracketed header name is enumerable',
        code: `new Response(html, { headers: { ['X-Frame-Options']: 'DENY' } });`,
        errors: missingCspAndNosniff,
      },
      {
        name: 'an unquoted header name in a ResponseInit is a header',
        code: `new Response(html, { headers: { Link: '</app.css>; rel=preload' } });`,
        errors: missing(
          'Content-Security-Policy, X-Frame-Options, X-Content-Type-Options',
        ),
      },
      {
        // @found mutation testing
        name: 'FN: a quoted key field in a Next.js entry names the header',
        code: `const c = { headers: [{ 'key': 'X-Frame-Options', value: 'DENY' }] };`,
        errors: missingCspAndNosniff,
      },
      {
        // @found mutation testing
        name: 'FN: a quoted status field marks a ResponseInit',
        code: `const init = { 'status': 200, headers: { 'X-Frame-Options': 'DENY' } };`,
        errors: missingCspAndNosniff,
      },
    ],
  },
);
