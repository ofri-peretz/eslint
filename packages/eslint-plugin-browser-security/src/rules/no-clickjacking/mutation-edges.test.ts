/**
 * Fixtures implied by surviving Stryker mutants (docs/MUTATION_TESTING.md).
 *
 * Each case pins a branch no other fixture told apart from its mutant. The
 * `FP:` / `FN:` cases are wrong verdicts the triage found: they fail on the
 * rule as it was before this file.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import parser from '@typescript-eslint/parser';
import * as vitest from 'vitest';
import { noClickjacking } from './index';

RuleTester.afterAll = vitest.afterAll;
RuleTester.it = vitest.it;
RuleTester.itOnly = vitest.it.only;
RuleTester.describe = vitest.describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

/** A file that builds the framable document, so a missing protection reports. */
const shell = (body: string): string =>
  `export default function Root() { ${body} return <html><body /></html>; }`;

const missing = [{ messageId: 'missingFrameBusting' as const }];
const overlay = [{ messageId: 'transparentFrameOverlay' as const }];
const iframe = [{ messageId: 'unsafeIframeUsage' as const }];
const weak = [{ messageId: 'weakFrameProtection' as const }];

ruleTester.run('no-clickjacking — mutation edges', noClickjacking, {
  valid: [
    // ── frame-busting tests ──────────────────────────────────────────────────
    {
      name: 'a location comparison inside a compound test still busts the frame',
      code: `if (!embedded && top.location !== self.location) { x(); } const f = <html><body /></html>;`,
    },
    // ── declared protection ──────────────────────────────────────────────────
    {
      name: 'an empty frame-ancestors source list matches no framer',
      code: `export const csp = "default-src 'self'; frame-ancestors";`,
    },
    {
      name: 'frame-ancestors restricted to a wildcard subdomain forbids other framers',
      code: shell(
        `const csp = "default-src 'self'; frame-ancestors *.partner.example";`,
      ),
    },
    {
      name: 'a raw X-Frame-Options header line carrying DENY declares protection',
      code: shell(`const line = 'X-Frame-Options: DENY';`),
    },
    {
      name: 'a header line with no space after the colon declares protection',
      code: shell(`const line = 'X-Frame-Options:SAMEORIGIN';`),
    },
    {
      name: 'a header line with a space before the colon declares protection',
      code: shell(`const line = 'X-Frame-Options : DENY';`),
    },
    {
      name: 'a JSON header string carrying DENY declares protection',
      code: shell(`const json = '{"X-Frame-Options": "DENY"}';`),
    },
    {
      name: 'a template policy with an interpolated tail still declares frame-ancestors',
      code: shell(
        "const csp = `default-src 'self'; frame-ancestors 'none'; ${extra}`;",
      ),
    },
    // ── trustedSources ───────────────────────────────────────────────────────
    {
      name: 'a relative src is trusted by self listed beside an origin',
      code: '<iframe src="/embed" />',
      options: [{ trustedSources: ['self', 'https://partner.example'] }],
    },
    {
      name: 'a relative src is trusted by self alone',
      code: '<iframe src="/embed" />',
      options: [{ trustedSources: ['self'] }],
    },
    {
      name: 'a relative src is trusted by same-origin alone',
      code: '<iframe src="/embed" />',
      options: [{ trustedSources: ['same-origin'] }],
    },
    {
      name: 'a non-URL src listed verbatim is trusted',
      code: '<iframe src="about:blank" />',
      options: [{ trustedSources: ['about:blank'] }],
    },
    {
      name: 'an img with a foreign src is not an iframe',
      code: '<img src="https://evil.example/pixel.png" />',
    },
    {
      name: 'a spread attribute on an iframe names no src',
      code: '<iframe {...props} />',
    },
    // ── overlays ─────────────────────────────────────────────────────────────
    {
      name: 'a zero-opacity element that is display: none receives no clicks',
      code: `const s = 'position: absolute; opacity: 0; display: none';`,
    },
    {
      name: 'opacity 10% is not transparent',
      code: `const s = 'position: absolute; opacity: 10%';`,
    },
    {
      name: 'visibility visible is not hidden',
      code: `const s = 'position: absolute; visibility: visible';`,
    },
    // ── frame manipulation ───────────────────────────────────────────────────
    {
      // @found mutation testing
      name: 'FP: reading the top frame location into a string navigates nothing',
      code: `const where = 'framed at ' + top.location;`,
    },
    {
      name: 'assigning another object location is not frame manipulation',
      code: `router.location = '/home';`,
    },
    {
      name: 'navigating its own frame through self is not frame manipulation',
      code: `self.location = '/login';`,
    },
    {
      name: 'assigning a callback on the parent frame is not navigation',
      code: `parent.onFrameReady = handleReady;`,
    },
    {
      name: 'a guarded const arrow called only inside the guard is contained',
      code: `if (top != self) { const go = () => { top.location = self.location; }; go(); }`,
    },
  ],
  invalid: [
    // ── frame-busting tests ──────────────────────────────────────────────────
    {
      name: 'a top/parent pair on another object is not a frame-busting test',
      code: `if (layout.top !== layout.parent) { x(); } const f = <html><body /></html>;`,
      errors: missing,
    },
    {
      name: 'two window properties that are not frames are not a frame-busting test',
      code: `if (window.innerWidth !== window.outerWidth) { x(); } const f = <html><body /></html>;`,
      errors: missing,
    },
    {
      name: 'a frame count read is not a location test',
      code: `if (parent.length > 0) { x(); } const f = <html><body /></html>;`,
      errors: missing,
    },
    // ── declared protection ──────────────────────────────────────────────────
    {
      name: 'a bare deny template outside a header slot is not frame protection',
      code: shell('const mode = `deny`;'),
      errors: missing,
    },
    {
      name: 'a camelCase fetch directive is a policy, and one without frame-ancestors permits framing',
      code: `export const csp = "scriptSrc 'self'; frame-ancestors *";`,
      errors: weak,
    },
    {
      name: 'a multi-line template policy whose frame-ancestors is * permits framing',
      code: "export const csp = `default-src 'self';\n  frame-ancestors *\n`;",
      errors: weak,
    },
    {
      name: 'only the value of a key/value header entry is its value slot',
      code: `export const h = { key: 'X-Frame-Options', value: 'ALLOWALL' };`,
      errors: weak,
    },
    {
      name: 'a name/value entry is not the key/value header shape',
      code: shell(`const h = { name: 'X-Frame-Options', value: 'DENY' };`),
      errors: missing,
    },
    {
      name: 'a computed sibling key is not the key/value header shape',
      code: shell(`const h = { [field]: 'X-Frame-Options', value: 'DENY' };`),
      errors: missing,
    },
    {
      name: 'a deny value under another header is not frame protection',
      code: shell(`const h = { key: 'X-Permission-Mode', value: 'deny' };`),
      errors: missing,
    },
    {
      name: 'a deny value set on another header is not frame protection',
      code: shell(`res.setHeader('X-Permission-Mode', 'deny');`),
      errors: missing,
    },
    {
      name: 'an X-Frame-Options value that merely contains deny is not DENY',
      code: `export const h = { 'X-Frame-Options': 'ALLOW-FROM https://deny.example' };`,
      errors: weak,
    },
    {
      name: 'an X-Frame-Options value that merely ends in deny is not DENY',
      code: `export const h = { 'X-Frame-Options': 'ALLOW-FROM https://partner.example/deny' };`,
      errors: weak,
    },
    // ── trustedSources ───────────────────────────────────────────────────────
    {
      name: 'a URL echoed in a relative path is not that origin',
      code: '<iframe src="/out?to=https://trusted.com" />',
      options: [{ trustedSources: ['https://trusted.com'] }],
      errors: iframe,
    },
    {
      name: 'a foreign host sharing the first letter is not the trusted origin',
      code: '<iframe src="https://tracker.evil/w" />',
      options: [{ trustedSources: ['https://trusted.com'] }],
      errors: iframe,
    },
    {
      name: 'a relative src is untrusted when the allowlist names no origin of its own',
      code: '<iframe src="/embed" />',
      options: [{ trustedSources: ['partner-widgets'] }],
      errors: iframe,
    },
    {
      // @found mutation testing
      name: 'FN: a string index reads the same embed table element as the number',
      code: `const E = ['https://evil.example/w']; const el = <iframe src={E['0']} />;`,
      errors: iframe,
    },
    // ── overlays ─────────────────────────────────────────────────────────────
    {
      name: 'a value with a space before the semicolon is still compared whole',
      code: `const s = 'opacity: 0 ; position: absolute';`,
      errors: overlay,
    },
    {
      name: 'an invisible overlay that captures every pointer event is not animated',
      code: `const s = 'position: absolute; opacity: 0; pointer-events: all';`,
      errors: overlay,
    },
    {
      name: 'a zero-opacity element that is displayed is an overlay',
      code: `const s = 'position: absolute; opacity: 0; display: block';`,
      errors: overlay,
    },
    {
      name: 'opacity 0.00 is fully transparent',
      code: `const s = 'position: absolute; opacity: 0.00';`,
      errors: overlay,
    },
    {
      name: 'a multi-digit negative z-index parks the element behind the page',
      code: `const s = 'position: absolute; z-index: -10';`,
      errors: overlay,
    },
    // ── frame manipulation ───────────────────────────────────────────────────
    {
      name: 'a guarded var function called before the guard escapes it',
      code: `go(); if (top != self) { var go = function () { top.location = self.location; }; }`,
      errors: [{ messageId: 'frameManipulation' }],
    },
  ],
});
