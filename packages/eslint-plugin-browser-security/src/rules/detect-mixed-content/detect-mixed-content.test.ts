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

    // --- NOT this rule's shape any more -------------------------------------
    // The predicate is now a SUBRESOURCE position, so every `http://` string
    // that is not being loaded belongs to a sibling. These are not "safe" —
    // `no-http-urls` reports each of them. They are silent HERE so that one
    // line does not draw two findings under two CWEs, which is what got this
    // rule demoted out of `recommended` in the first place.
    { code: "const url = 'http://acmecorp.io/api'" },        // -> no-http-urls
    { code: "fetch('http://cdn.acmecorp.io/lib.js')" },      // -> require-https-only
    { code: "const base = 'http://localhost.evil.com/api'" },// -> no-http-urls
    { code: "const base = 'http://'" },                      // -> no-http-urls
    { code: "const svg = 'http://www.w3.org/2000/svg'" },    // namespace: nobody
    { code: "const {pathname, search} = new URL(p, 'http://e.c');" }, // discarded base: nobody

    // HTTPS subresources are the remediation.
    { code: "el.src = 'https://cdn.acmecorp.io/lib.js'" },
    { code: "importScripts('https://cdn.acmecorp.io/sw.js')" },
    { code: "el.setAttribute('src', 'https://cdn.acmecorp.io/a.js')" },
    // A relative subresource inherits the page scheme, so it cannot be mixed.
    { code: "el.src = '/static/lib.js'" },

    // --- loopback is a secure context, so it cannot be mixed content ---------
    // Per the Secure Contexts spec a loopback origin is potentially
    // trustworthy, so no browser blocks or flags it from an HTTPS page.
    // `<img src="http://localhost:3000/preview.png">` is ordinary dev code.
    { code: "el.src = 'http://localhost:3000/preview.png'" },
    { code: "el.src = 'http://127.0.0.1:8080/a.png'" },
    { code: "el.src = 'http://app.localhost:3000/a.png'" },

    // A property that is not a subresource, and an attribute name that is not.
    { code: "el.title = 'http://acmecorp.io/api'" },
    { code: "el.setAttribute('data-endpoint', 'http://acmecorp.io/api')" },
    { code: "el.setAttribute(attrName, 'http://acmecorp.io/api')" },
    // A computed property whose key is not statically a subresource name.
    { code: "el[prop] = 'http://acmecorp.io/api'" },
    // A call that merely takes the URL as an argument loads nothing.
    { code: "logEndpoint('http://acmecorp.io/api')" },
    { code: "client.connect('http://acmecorp.io/api')" },
  ],

  invalid: [
    // `.src` is a subresource on every element that has one, so the property
    // alone is sufficient evidence — no type information needed.
    {
      code: "el.src = 'http://cdn.acmecorp.io/analytics.js'",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Computed access with a static key is the same assignment.
    {
      code: "el['src'] = 'http://cdn.acmecorp.io/analytics.js'",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "video.poster = 'http://cdn.acmecorp.io/frame.jpg'",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "img.srcset = 'http://cdn.acmecorp.io/a-2x.png 2x'",
      errors: [{ messageId: 'violationDetected' }],
    },
    // `setAttribute` names the subresource property outright.
    {
      code: "el.setAttribute('src', 'http://cdn.acmecorp.io/a.js')",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Case-insensitive: HTML attribute names are ASCII case-insensitive.
    {
      code: "el.setAttribute('SRC', 'http://cdn.acmecorp.io/a.js')",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A service worker pulling its helper over cleartext.
    {
      code: "importScripts('http://cdn.acmecorp.io/sw-helper.js')",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "self.importScripts('http://cdn.acmecorp.io/sw-helper.js')",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A loopback-LOOKING host that is a real remote host.
    {
      code: "el.src = 'http://localhost.evil.com/a.js'",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Starts with http:// but does not parse as a URL, so the loopback guard
    // cannot vouch for it. It must fail closed, not throw.
    {
      code: "el.src = 'http://'",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A template literal: the path is dynamic, the scheme is not. Reported
    // here because `no-http-urls` declines an interpolated authority, so
    // without this branch the shape would be uncovered by every rule.
    {
      code: 'el.src = `http://cdn.acmecorp.io/${id}.png`',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'el.src = `http://${host}/a.png`',
      errors: [{ messageId: 'violationDetected' }],
    },
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
    // `xmlns` is not a subresource attribute on any element, so the namespace
    // exemption is now structural rather than a special case.
    { code: '<svg xmlns="http://www.w3.org/2000/svg" />' },
    // An ANCHOR is a navigation, not a subresource. No browser blocks or warns
    // on it, so calling it mixed content would describe behaviour that does not
    // happen. `no-http-urls` reports it instead.
    { code: '<a href="http://docs.acmecorp.io">docs</a>' },
    // A component prop is not an element attribute: `<Image src>` may resolve
    // to anything at all, so there is no subresource to claim.
    { code: '<Image src="http://cdn.acmecorp.io/logo.png" />' },
    // A member-expression element name (`<Foo.Bar src=…>`) is likewise not a
    // host element.
    { code: '<Foo.Bar src="http://cdn.acmecorp.io/logo.png" />' },
    // An attribute that does not load anything.
    { code: '<img alt="http://cdn.acmecorp.io/logo.png" src="/a.png" />' },
    // A namespaced JSX attribute name is not a subresource attribute.
    { code: '<img xlink:href="http://www.w3.org/1999/xlink" src="/a.png" />' },
    // A valueless attribute has no URL to judge.
    { code: '<img src />' },
    // The remediation.
    { code: '<img src="https://cdn.acmecorp.io/logo.png" />' },
    { code: '<img src="/static/logo.png" />' },
  ],
  invalid: [
    {
      code: '<img src="http://cdn.acmecorp.io/logo.png" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: '<script src="http://cdn.acmecorp.io/a.js" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      // `rel` is what makes a <link> fetch — see the regression suite below.
      code: '<link rel="stylesheet" href="http://cdn.acmecorp.io/a.css" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: '<iframe src="http://widget.acmecorp.io/embed" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    // A form POSTing over cleartext from an HTTPS page is "mixed form action",
    // which browsers warn on by name.
    {
      code: '<form action="http://forms.acmecorp.io/subscribe" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: '<object data="http://cdn.acmecorp.io/doc.pdf" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: '<video poster="http://cdn.acmecorp.io/frame.jpg" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: '<source srcSet="http://cdn.acmecorp.io/a-2x.png 2x" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Wrapped in an expression container — the same load, one AST hop further.
    {
      code: '<img src={"http://cdn.acmecorp.io/logo.png"} />',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: '<img src={`http://cdn.acmecorp.io/${id}.png`} />',
      errors: [{ messageId: 'violationDetected' }],
    },

    // --- REGRESSION: adversarial corpus wave --------------------------------
    // FN. URL schemes are ASCII case-insensitive, so `HTTP://` loads exactly
    // like `http://`. The rule tested `startsWith('http://')` and the shift key
    // defeated it — on legacy URLs, which are the ones most likely to still be
    // cleartext. Every sibling in the family already tested case-insensitively.
    {
      code: '<img src="HTTP://cdn.acmecorp.io/logo.png" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: '<img src="Http://cdn.acmecorp.io/logo.png" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    // A fetching `rel` is still a subresource, so the `rel` gate must not have
    // turned the whole `<link>` case off.
    {
      code: '<link rel="preload" as="font" href="http://cdn.acmecorp.io/a.woff2" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: '<link rel="shortcut icon" href="http://cdn.acmecorp.io/favicon.ico" />',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

/*
 * ── REGRESSION: `<link>` needs its `rel` read ────────────────────────────────
 *
 * FP found by the adversarial corpus wave. `<link rel="canonical">` declares an
 * IDENTITY — no request is made, so there is no mixed content and no
 * remediation to offer. Keying on the element+attribute pair alone reported
 * every canonical tag in every server-rendered app.
 *
 * A dynamic or missing `rel` fails CLOSED to "not a subresource": guessing
 * would cost every canonical tag, while declining costs the family nothing
 * because `no-http-urls` still reports the cleartext URL.
 */
jsxRuleTester.run('regression: link rel decides whether href loads', detectMixedContent, {
  valid: [
    { code: '<link rel="canonical" href="http://acmecorp.io/page" />' },
    { code: '<link rel="alternate" type="application/rss+xml" href="http://acmecorp.io/feed.xml" />' },
    { code: '<link rel="author" href="http://acmecorp.io/about" />' },
    { code: '<link rel="license" href="http://acmecorp.io/license" />' },
    // Unknowable rel.
    { code: '<link rel={kind} href="http://cdn.acmecorp.io/a.css" />' },
    // No rel at all: the link does nothing.
    { code: '<link href="http://cdn.acmecorp.io/a.css" />' },
    // A spread carrying the rel is equally unknowable.
    { code: '<link {...rest} href="http://cdn.acmecorp.io/a.css" />' },
  ],
  invalid: [
    {
      code: '<link rel="stylesheet" href="http://cdn.acmecorp.io/a.css" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: '<link rel="manifest" href="http://cdn.acmecorp.io/app.webmanifest" />',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Case-insensitive token match, as the HTML spec requires.
    {
      code: '<link rel="StyleSheet" href="http://cdn.acmecorp.io/a.css" />',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
