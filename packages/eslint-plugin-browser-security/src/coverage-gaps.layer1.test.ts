/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Layer-1 coverage tests: RuleTester fixtures through the real parser.
 *
 * Every case below targets a specific previously-uncovered line/branch found
 * by the 100% coverage wave (see PR #222 annotation-debt inventory). Cases
 * are grouped per rule and assert concrete diagnostics (messageIds) or the
 * absence thereof.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vitest from 'vitest';
import parser from '@typescript-eslint/parser';

import { noClickjacking } from './rules/no-clickjacking';
import { noClientSideAuthLogic } from './rules/no-client-side-auth-logic';
import { noCookieAuthTokens } from './rules/no-cookie-auth-tokens';
import { noCredentialsInQueryParams } from './rules/no-credentials-in-query-params';
import { noDisabledCertificateValidation } from './rules/no-disabled-certificate-validation';
import { noDynamicServiceWorkerUrl } from './rules/no-dynamic-service-worker-url';
import { noEval } from './rules/no-eval';
import { noFilereaderInnerhtml } from './rules/no-filereader-innerhtml';
import { noHttpUrls } from './rules/no-http-urls';
import { noInnerhtml } from './rules/no-innerhtml';
import { noInsecureRedirects } from './rules/no-insecure-redirects';
import { noInsecureWebsocket } from './rules/no-insecure-websocket';
import { noJwtInStorage } from './rules/no-jwt-in-storage';
import { noMissingCorsCheck } from './rules/no-missing-cors-check';
import { noMissingCsrfProtection } from './rules/no-missing-csrf-protection';
import { noMissingSecurityHeaders } from './rules/no-missing-security-headers';
import { noPostmessageInnerhtml } from './rules/no-postmessage-innerhtml';
import { noPostmessageWildcardOrigin } from './rules/no-postmessage-wildcard-origin';
import { noSensitiveCookieJs } from './rules/no-sensitive-cookie-js';
import { noSensitiveDataInAnalytics } from './rules/no-sensitive-data-in-analytics';
import { noSensitiveDataInCache } from './rules/no-sensitive-data-in-cache';
import { noSensitiveIndexeddb } from './rules/no-sensitive-indexeddb';
import { noSensitiveLocalstorage } from './rules/no-sensitive-localstorage';
import { noSensitiveSessionstorage } from './rules/no-sensitive-sessionstorage';
import { noTrackingWithoutConsent } from './rules/no-tracking-without-consent';
import { noUnencryptedTransmission } from './rules/no-unencrypted-transmission';
import { noUnescapedUrlParameter } from './rules/no-unescaped-url-parameter';
import { noUnsafeEvalCsp } from './rules/no-unsafe-eval-csp';
import { noUnsafeInlineCsp } from './rules/no-unsafe-inline-csp';
import { noWebsocketEval } from './rules/no-websocket-eval';
import { noWebsocketInnerhtml } from './rules/no-websocket-innerhtml';
import { noWorkerMessageInnerhtml } from './rules/no-worker-message-innerhtml';
import { requireBlobUrlRevocation } from './rules/require-blob-url-revocation';
import { requireCookieSecureAttrs } from './rules/require-cookie-secure-attrs';
import { requireCspHeaders } from './rules/require-csp-headers';
import { requireHttpsOnly } from './rules/require-https-only';
import { requireMimeTypeValidation } from './rules/require-mime-type-validation';
import { requirePostmessageOriginCheck } from './rules/require-postmessage-origin-check';
import { requireUrlValidation } from './rules/require-url-validation';
import { requireWebsocketWss } from './rules/require-websocket-wss';

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

const jsxRuleTester = new RuleTester({
  languageOptions: {
    parser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

// ---------------------------------------------------------------------------
// no-clickjacking
// ---------------------------------------------------------------------------
jsxRuleTester.run('no-clickjacking (coverage)', noClickjacking, {
  valid: [
    // entry-point file without UI elements -> no missing-frame-busting report
    { code: 'const a = 1;', filename: 'index.tsx' },
    // The four shapes that used to report purely because of the FILENAME.
    { code: `export const App = () => <button onClick={go}>hi</button>;`, filename: 'app.tsx' },
    { code: `export const Page = () => <form onSubmit={s}></form>;`, filename: 'main.jsx' },
    { code: `export const Page = () => <input />;`, filename: 'pages/settings.tsx' },
    { code: `export const Page = () => <div onClick={h}></div>;`, filename: 'layout.tsx' },
    // frame-busting comparison: BinaryExpression with equality operator breaks
    // out of the manipulation walk (operator whitelist branch)
    {
      code: `
        if (window.top !== window.self) { doSomething(); }
        const irrelevant = 1;
      `,
      filename: 'lib.ts',
    },
    // additional frame-busting text patterns for isFrameBustingCode arms
    { code: `if (top != self) { x(); }`, filename: 'lib.ts' },
    { code: `if (parent != self) { x(); }`, filename: 'lib.ts' },
    { code: `if (check(self.location)) { x(); }`, filename: 'lib.ts' },
    // @safe annotation suppresses frame manipulation report
    {
      code: `
        // @safe - trusted navigation helper
        top.location = 'https://trusted.example.com';
      `,
      filename: 'lib.ts',
    },
    // @safe annotation suppresses unsafe iframe report
    {
      code: `
        // @safe - reviewed embed
        const f = <iframe src="https://third-party.example.com" />;
      `,
      filename: 'lib.tsx',
    },
    // @safe annotation suppresses transparent overlay literal report
    {
      code: `
        // @safe - part of the design system
        const css = 'style= opacity: 0';
      `,
      filename: 'lib.ts',
    },
    // @safe annotation suppresses transparent overlay template report
    {
      code: `
        // @safe - part of the design system
        const css = \`style opacity: 0\`;
      `,
      filename: 'lib.ts',
    },
    // trusted iframe sources
    { code: `const f = <iframe src="/local/page" />;`, filename: 'lib.tsx' },
    { code: `const f = <iframe />;`, filename: 'lib.tsx' },
    // dynamic iframe src (JSXExpressionContainer, not a Literal)
    { code: `const f = <iframe src={dynamicUrl} />;`, filename: 'lib.tsx' },
    // transparent overlay detection disabled by option
    {
      code: `const css = 'style= opacity: 0';`,
      options: [{ detectTransparentOverlays: false }],
      filename: 'lib.ts',
    },
    // css keyword without transparent styles
    { code: `const css = 'css position: absolute';`, filename: 'lib.ts' },
    // --- `display: none` is not a clickjacking overlay ---------------------
    // This fixture used to live in `invalid`, pinning the defect. A hidden
    // element is removed from layout and receives no clicks — it is the
    // OPPOSITE of a transparent element that swallows them. Both corpus
    // findings for this rule were this shape:
    // Shopify/cli packages/cli-kit/src/public/node/graphiql/templates/
    //   graphiql.tsx:71 and .../unauthorized.tsx:112.
    { code: `const css = 'css display: none';`, filename: 'lib.ts' },
    {
      code: `const t = \`<style> #top-error-bar button { display: none; } </style>\`;`,
      filename: 'lib.ts',
    },
    // Whole-value comparison: `opacity: 0.5` is not transparent, and neither
    // is `top: 0.5rem`. The substring matcher reported both.
    { code: `const css = 'css opacity: 0.5';`, filename: 'lib.ts' },
    {
      code: `const css = 'css position: absolute; top: 0.5rem; left: 0.5rem';`,
      filename: 'lib.ts',
    },
    // A positive z-index is not a hidden layer.
    { code: `const css = 'css z-index: 10';`, filename: 'lib.ts' },
    // `position: absolute` alone does not make an overlay.
    { code: `const css = 'css position: absolute; top: 40px; left: 0';`, filename: 'lib.ts' },
    // Nor does it at the corner. This exact string was asserted INVALID until
    // the overlay signal was narrowed to actual invisibility — see the note in
    // the `invalid` block below.
    { code: `const css = 'css position: absolute; top: 0; left: 0';`, filename: 'lib.ts' },
    // A fade-in is invisible for 300ms on its way to being VISIBLE, which is
    // the commonest loading affordance on the web.
    {
      code: `const css = 'opacity: 0; transition: opacity 0.3s ease-in;';`,
      filename: 'lib.ts',
    },
    // template with style but no transparent styles
    { code: `const t = \`style color: red\`;`, filename: 'lib.ts' },
    // window.self member access (property not location/top)
    { code: `const s = window.self;`, filename: 'lib.ts' },
  ],
  invalid: [
    // A document shell with no frame protection. These four fixtures used to
    // be `<button>`, `<form>`, `<input>` and `onClick` in files NAMED
    // app.tsx / main.jsx / pages/settings.tsx / layout.tsx — they pinned a
    // verdict that came from the filename regex and a whole-file text scan.
    {
      code: `export const App = () => <html><body><button onClick={go}>hi</button></body></html>;`,
      filename: 'app.tsx',
      errors: [{ messageId: 'missingFrameBusting' }],
    },
    {
      code: `export const Page = () => <body><form onSubmit={s}></form></body>;`,
      filename: 'main.jsx',
      errors: [{ messageId: 'missingFrameBusting' }],
    },
    {
      code: `export const Page = () => <head><link rel="icon" href="/f.ico" /></head>;`,
      filename: 'pages/settings.tsx',
      errors: [{ messageId: 'missingFrameBusting' }],
    },
    // frame manipulation via assignment
    {
      code: `top.location = 'about:blank';`,
      filename: 'lib.ts',
      errors: [{ messageId: 'frameManipulation' }],
    },
    // frame manipulation via non-comparison binary expression
    {
      code: `const z = top.location + '';`,
      filename: 'lib.ts',
      errors: [{ messageId: 'frameManipulation' }],
    },
    // untrusted iframe source
    {
      code: `const f = <iframe src="https://evil.example.com" />;`,
      filename: 'lib.tsx',
      errors: [{ messageId: 'unsafeIframeUsage' }],
    },
    // transparent overlay arms in hasTransparentStyles
    {
      code: `const css = 'style= opacity:0';`,
      filename: 'lib.ts',
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
    {
      code: `const css = 'css visibility: hidden';`,
      filename: 'lib.ts',
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
    {
      code: `const css = 'css z-index: -1';`,
      filename: 'lib.ts',
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
    {
      // Declarations are separated by `;` — the previous spelling of this
      // fixture ran them together, which only ever parsed under the substring
      // matcher this rule no longer uses.
      //
      // NOTE — this fixture used to end at `left: 0` and be asserted INVALID,
      // i.e. a `transparentFrameOverlay` finding on a FULLY VISIBLE element.
      // "Positioned at the top-left corner" describes a hero, a scrim and a
      // sticky header far more often than it describes an attack. An overlay
      // is dangerous because it is in the hit-test tree and INVISIBLE; without
      // invisibility there is nothing to report, so the fixture now carries
      // the invisibility and the visible one is asserted valid above.
      code: `const css = 'css position: absolute; top: 0; left: 0; opacity: 0';`,
      filename: 'lib.ts',
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
    // template literal transparent overlay
    {
      code: `const t = \`style opacity: 0\`;`,
      filename: 'lib.ts',
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-client-side-auth-logic
// ---------------------------------------------------------------------------
ruleTester.run('no-client-side-auth-logic (coverage)', noClientSideAuthLogic, {
  valid: [
    `if (localStorage.getItem()) { grant(); }`,
    `if (localStorage.getItem(key)) { grant(); }`,
    `if (localStorage.getItem('theme')) { applyTheme(); }`,
    `if (a.foo === b.bar) { x(); }`,
  ],
  invalid: [
    {
      code: `if (x === user.secret) { grant(); }`,
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-cookie-auth-tokens
// ---------------------------------------------------------------------------
ruleTester.run('no-cookie-auth-tokens (coverage)', noCookieAuthTokens, {
  valid: [
    `x = 'token=y';`,
    `foo.cookie = 'accessToken=x';`,
    `document.title = 'accessToken=x';`,
    `document.cookie = 42;`,
    `document.cookie = 'theme=' + theme;`,
  ],
  invalid: [
    {
      code: `document.cookie = 'accessToken=' + token;`,
      errors: [{ messageId: 'authTokenInCookie' }],
    },
    // `document['cookie']` is the SAME sink. This used to be asserted VALID.
    {
      code: `document['cookie'] = 'accessToken=x';`,
      errors: [{ messageId: 'authTokenInCookie' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-credentials-in-query-params
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-credentials-in-query-params (coverage)',
  noCredentialsInQueryParams,
  {
    valid: [`const u = \`https://example.com/?page=\${p}\`;`],
    invalid: [],
  },
);

// ---------------------------------------------------------------------------
// no-disabled-certificate-validation
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-disabled-certificate-validation (coverage)',
  noDisabledCertificateValidation,
  {
    valid: [
      `process.env.OTHER_FLAG = '0';`,
      `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';`,
      `foo.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';`,
      `x = '0';`,
      `a.b = '0';`,
    ],
    invalid: [
      {
        code: `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';`,
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);

// ---------------------------------------------------------------------------
// no-dynamic-service-worker-url
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-dynamic-service-worker-url (coverage)',
  noDynamicServiceWorkerUrl,
  {
    valid: [`navigator.serviceWorker.register();`],
    invalid: [],
  },
);

// ---------------------------------------------------------------------------
// no-eval
// ---------------------------------------------------------------------------
ruleTester.run('no-eval (coverage)', noEval, {
  valid: [
    `window[evalName]('code');`,
    `window[42]('code');`,
    `window['somethingElse']('code');`,
    `new foo.Function('x');`,
    `new NotFunction('x');`,
    // A local declaration wearing the built-in's name is a local.
    `function Function(shape) { return shape; }\nFunction(userInput);`,
    // `.eval` on an arbitrary object is a different API (mathjs, an embedded
    // interpreter). The member branch used to accept ANY receiver.
    `math.eval(formula);`,
    // A timer given a function is a timer.
    `setTimeout(handler, 100);`,
  ],
  invalid: [
    {
      code: `window['eval']('code');`,
      errors: [{ messageId: 'dangerousEval' }],
    },
    {
      // ASSERTED VALID until now, with a comment explaining that `Function` was
      // "only flagged via `new Function`, not bracket calls". Bracket access to
      // the Function constructor calls the Function constructor; the comment
      // documented the defect rather than fixing it.
      code: `globalThis['Function']('code');`,
      errors: [{ messageId: 'dangerousEval' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-filereader-innerhtml
// ---------------------------------------------------------------------------
ruleTester.run('no-filereader-innerhtml (coverage)', noFilereaderInnerhtml, {
  valid: [
    // object of onload assignment is itself a member expression
    `const reader = new FileReader(); obj.reader.onload = (e) => { el.innerHTML = e.target.result; };`,
    // handler is an identifier reference
    `const reader = new FileReader(); reader.onload = handleLoad;`,
    // handler without parameters
    `const reader = new FileReader(); reader.onload = () => { el.innerHTML = window.cached; };`,
    // destructured handler parameter
    `const reader = new FileReader(); reader.onload = ({ target }) => { use(target); };`,
    // addEventListener with non-load event
    `const reader = new FileReader(); reader.addEventListener('error', (e) => { report(e); });`,
    // addEventListener with dynamic event name
    `const reader = new FileReader(); reader.addEventListener(evtName, (e) => { report(e); });`,
    // addEventListener with identifier callback
    `const reader = new FileReader(); reader.addEventListener('load', handleLoad);`,
    // addEventListener callback without params
    `const reader = new FileReader(); reader.addEventListener('load', () => { done(); });`,
    // addEventListener destructured param
    `const reader = new FileReader(); reader.addEventListener('load', ({ target }) => { use(target); });`,
    // member access that never reaches reader result
    `const reader = new FileReader(); reader.onload = (e) => { el.innerHTML = e.target.foo; };`,
  ],
  invalid: [
    // loadend event arm
    {
      code: `const reader = new FileReader(); reader.addEventListener('loadend', (e) => { el.innerHTML = e.target.result; });`,
      errors: [{ messageId: 'unsafeInnerhtml' }],
    },
    // deeply nested member expression resolved recursively
    {
      code: `const reader = new FileReader(); reader.onload = (e) => { el.innerHTML = e.target.result.data; };`,
      errors: [{ messageId: 'unsafeInnerhtml' }],
    },
    // dangerous method call sink inside handler
    {
      code: `const reader = new FileReader(); reader.onload = (e) => { el.insertAdjacentHTML('beforeend', e.target.result); };`,
      errors: [{ messageId: 'unsafeInnerhtml' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-http-urls
// ---------------------------------------------------------------------------
ruleTester.run('no-http-urls (coverage)', noHttpUrls, {
  valid: [
    // unparseable URL matched by allowedHosts pattern fallback
    {
      code: `const u = 'http://';`,
      options: [{ allowedHosts: ['http:'] }],
    },
    // allowed port
    {
      code: `const u = 'http://acmecorp.io:8080/a';`,
      options: [{ allowedPorts: [8080] }],
    },
  ],
  invalid: [
    // unparseable URL with no matching host pattern
    {
      code: `const u = 'http://';`,
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
    // port not in the allowed list
    {
      code: `const u = 'http://acmecorp.io:9999/a';`,
      options: [{ allowedPorts: [8080] }],
      errors: [{ messageId: 'insecureHttpWithException' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-innerhtml
// ---------------------------------------------------------------------------
ruleTester.run('no-innerhtml (coverage)', noInnerhtml, {
  valid: [
    `x = y;`,
    // `el['innerHTML'] = userInput;` USED TO LIVE HERE.
    //
    // It was added to cover the `property.type !== 'Identifier'` early return,
    // and in doing so asserted that a computed write to innerHTML is safe. It
    // is not — it is the same sink, and a one-line evasion of the whole rule.
    // Mozilla's no-unsanitized and @microsoft/sdl both miss it too, measured on
    // benchmarks/rule-corpus/browser-security__no-innerhtml.
    //
    // This is what a coverage-driven fixture costs: written to reach a branch,
    // it certifies that branch's behaviour as intended. It is now an INVALID
    // case below.
    `el[dynamicProp] = userInput;`,
    `el.title = userInput;`,
    `write(userInput);`,
    `document.getElementById('a');`,
    `document.write();`,
    // literal strings allowed by default
    `document.write('<b>hi</b>');`,
    // sanitized content
    `document.write(DOMPurify.sanitize(userInput));`,
  ],
  invalid: [
    {
      // Computed property write — the same sink as `el.innerHTML = x`, and a
      // one-line evasion. Was pinned as VALID by a coverage fixture.
      code: `el['innerHTML'] = userInput;`,
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      // Computed method call — likewise.
      code: `document['write'](userInput);`,
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: `document.write(userHtml);`,
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: `document.writeln(\`<p>\${x}</p>\`);`,
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
    {
      code: `el.insertAdjacentHTML('beforeend', getHtml());`,
      errors: [{ messageId: 'dangerousInnerHTML' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-insecure-redirects
// ---------------------------------------------------------------------------
// `utils/navigation-targets.ts` restates three of `utils/url-taint.ts`'s
// composite cases so that the sources only IT can see — the computed holder
// `window['location']`, a params container built over one — still count in a
// trailing position. Widening url-taint to see URL containers made url-taint
// answer first for every shape the two agree on, which left those restatements
// covered by nothing. These three drive them through a value url-taint cannot
// resolve on its own.
ruleTester.run('navigation-targets restatements (coverage)', noInsecureRedirects, {
  valid: [
    // a BinaryExpression that is not concatenation at all
    `location.assign(offset - 1);`,
    // concatenation whose LEADING operand is not steerable
    `location.assign(base + '/x');`,
  ],
  invalid: [
    {
      code: `location.assign(fallback || window['location'].hash);`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    {
      code: `location.assign(flag ? '/safe' : window['location'].hash);`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    {
      code: `location.assign(new URL(window['location'].href).searchParams.get('n'));`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    {
      code: `location.assign(new URLSearchParams(window['location'].search).get('n'));`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    {
      code: `location.assign(window['location'].hash + '/x');`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    {
      code: 'location.assign(`${window[\'location\'].hash}/x`);',
      errors: [{ messageId: 'insecureRedirect' }],
    },
  ],
});

ruleTester.run('no-insecure-redirects (coverage)', noInsecureRedirects, {
  valid: [
    // argument resolves to a non-user-input initializer
    `const other = '/home'; res.redirect(other);`,
    // undeclared identifier cannot be resolved -> assumed safe
    `res.redirect(unknownVar);`,
    // declaration without initializer
    `let pending; res.redirect(pending);`,
    // declaration with a different name in scope
    `const a = req.query.next; res.redirect(b);`,
    // validation in the if-condition guarding the redirect
    `const t = req.query.next; if (isValidUrl(t)) { res.redirect(t); }`,
    // window.location.href assigned a safe literal
    `window.location.href = '/dashboard';`,
    // non-window object
    `myapp.location.href = req.query.next;`,
    // different property
    `window.location.hash = req.query.next;`,
  ],
  invalid: [
    // indirect user input through a resolved variable
    {
      code: `const returnUrl = req.query.returnTo; res.redirect(returnUrl);`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    // unvalidated if-condition still reports
    {
      code: `const t = req.query.next; if (someFlag) { res.redirect(t); }`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    // window.location.href from user input
    {
      code: `window.location.href = req.query.next;`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-insecure-websocket
// ---------------------------------------------------------------------------
ruleTester.run('no-insecure-websocket (coverage)', noInsecureWebsocket, {
  valid: [
    `new WebSocket();`,
    `new WebSocket(url);`,
    `new WebSocket(42);`,
    `new WebSocket('wss://secure.example.com');`,
    `new WebSocket(\`wss://\${host}\`);`,
    // Deferred to `require-websocket-wss`, which owns the constructor argument
    // and reports it WITH an autofix. Previously invalid here as well, so the
    // line drew two findings.
    `new WebSocket('ws://acmecorp.io');`,
    `new WebSocket(\`ws://\${host}\`);`,
  ],
  invalid: [
    // non-WebSocket constructor: only the Literal visitor reports
    {
      code: `new Foo('ws://acmecorp.io');`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // member-expression callee: only the Literal visitor reports
    {
      code: `new a.WebSocket('ws://acmecorp.io');`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // A `ws://` endpoint in a config map — this rule's territory now that the
    // constructor argument belongs to `require-websocket-wss`.
    {
      code: `const SOCKETS = { live: 'ws://live.acmecorp.io' };`,
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-jwt-in-storage
// ---------------------------------------------------------------------------
ruleTester.run('no-jwt-in-storage (coverage)', noJwtInStorage, {
  valid: [
    `localStorage.setItem();`,
    `localStorage.setItem(someKey, value);`,
    `x = 5;`,
    `foo['token'] = value;`,
    `a.b['token'] = value;`,
    `localStorage[someKey] = value;`,
    `localStorage[k.x] = value;`,
    `localStorage[0] = value;`,
  ],
  invalid: [
    // identifier key that looks like a JWT key
    {
      code: `localStorage.setItem(jwt, value);`,
      errors: [{ messageId: 'jwtInStorage' }],
    },
    // dynamic key but JWT-shaped value
    {
      code: `localStorage.setItem(k[0], 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig123');`,
      errors: [{ messageId: 'jwtInStorage' }],
    },
    // assignment with non-JWT key but JWT-shaped value
    {
      code: `localStorage['data'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig123';`,
      errors: [{ messageId: 'jwtInStorage' }],
    },
    // computed dynamic key with JWT value -> '<dynamic>' data path
    {
      code: `localStorage[k.x] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.sig123';`,
      errors: [{ messageId: 'jwtInStorage' }],
    },
    // identifier property key on assignment matching a JWT key
    {
      code: `localStorage[jwt] = value;`,
      errors: [{ messageId: 'jwtInStorage' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-missing-cors-check
// ---------------------------------------------------------------------------
ruleTester.run('no-missing-cors-check (coverage)', noMissingCorsCheck, {
  valid: [
    // wrapped cors factory treated as cors call with no object args
    `app.use(makeCors());`,
    // identifier config that is not an object literal
    `const corsConfig = getConfig(); app.use(cors(corsConfig));`,
    // identifier config without initializer
    `let corsConfig; app.use(cors(corsConfig));`,
    // identifier config with safe origin
    `const corsConfig = { origin: 'https://ok.example.com' }; app.use(cors(corsConfig));`,
    // arrow function with expression body: no lookup scope
    `const setup = () => app.use(cors(cfg));`,
    // computed setHeader member: property is not an Identifier
    `res['setHeader']('Access-Control-Allow-Origin', '*');`,
    // member expression not part of a call
    `const fn = res.setHeader;`,
    // header without CORS relevance
    `res.setHeader('X-Other', '*');`,
    // non-wildcard header value
    `res.setHeader('Access-Control-Allow-Origin', origin);`,
    // header call with a single argument
    `res.setHeader('Access-Control-Allow-Origin');`,
    // ignore pattern suppresses member expression check (with invalid-regex arm)
    {
      code: `legacyRes.setHeader('Access-Control-Allow-Origin', '*');`,
      options: [{ ignorePatterns: ['[', 'legacy'] }],
    },
    // test file allowance
    {
      code: `app.use(cors({ origin: '*' }));`,
      options: [{ allowInTests: true }],
      filename: 'cors.test.ts',
    },
  ],
  invalid: [
    // trusted library: checkCallExpression returns early (isTrustedLibrary),
    // but checkLiteral still reports the wildcard origin literal
    {
      code: `app.use(corsLib({ origin: '*' }));`,
      options: [{ trustedLibraries: ['corsLib'] }],
      errors: [{ messageId: 'missingCorsCheck' }],
    },
    // wildcard literal directly inside a cors() call (not a property)
    {
      code: `app.use(cors('*'));`,
      errors: [{ messageId: 'missingCorsCheck' }],
    },
    // computed origin key: shouldSkip stays false, actual CORS context reports
    {
      code: `app.use(cors({ ['origin']: '*' }));`,
      errors: [{ messageId: 'missingCorsCheck' }],
    },
    // identifier config resolved at module scope
    {
      code: `const corsConfig = { origin: '*' }; app.use(cors(corsConfig));`,
      errors: [{ messageId: 'missingCorsCheck' }],
    },
    // identifier config resolved inside a function declaration
    {
      code: `function setup() { const cfg = { origin: '*' }; app.use(cors(cfg)); }`,
      errors: [{ messageId: 'missingCorsCheck' }],
    },
    // identifier config resolved inside an arrow function body
    {
      code: `const setup = () => { const cfg = { origin: '*' }; app.use(cors(cfg)); };`,
      errors: [{ messageId: 'missingCorsCheck' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-missing-csrf-protection
// ---------------------------------------------------------------------------
ruleTester.run('no-missing-csrf-protection (coverage)', noMissingCsrfProtection, {
  valid: [
    // fewer than two arguments
    `import express from 'express';\nconst app = express();\napp.post('/incomplete');`,
    // invalid regex ignore pattern falls back to includes() and matches
    {
      code: `import express from 'express';\nconst app = express();\napp.post('(weird', handler);`,
      options: [{ ignorePatterns: ['('] }],
    },
  ],
  invalid: [
    // invalid regex ignore pattern that does not match falls through
    {
      code: `import express from 'express';\nconst app = express();\napp.post('/a', handler);`,
      options: [{ ignorePatterns: ['['] }],
      errors: [
        {
          messageId: 'missingCsrfProtection',
          suggestions: [
            {
              messageId: 'addCsrfValidation',
              output: `import express from 'express';\nconst app = express();\napp.post('/a', csrf(), handler);`,
            },
          ],
        },
      ],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-missing-security-headers
// ---------------------------------------------------------------------------
ruleTester.run('no-missing-security-headers (coverage)', noMissingSecurityHeaders, {
  valid: [
    // custom required header satisfied
    {
      code: `res.setHeader('X-Custom', '1');`,
      options: [{ requiredHeaders: ['X-Custom'] }],
    },
    // A header name the rule cannot read makes the whole scope unreadable, so
    // it cannot say anything is absent.
    //
    // NOTE — this fixture used to live in `invalid`, pinning the defect: with
    // a dynamic name nothing landed in the "set" list, so the rule returned
    // all three as missing and reported. That is reporting by IGNORANCE, and
    // it fired on the commonest way a codebase applies headers at all:
    // `for (const [n, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(n, v)`
    // — a loop that sets every one of them.
    `res.setHeader(headerName, value);`,
    // all default headers set within one function
    `function handler(req, res) {
       res.setHeader('Content-Security-Policy', "default-src 'self'");
       res.setHeader('X-Frame-Options', 'DENY');
       res.setHeader('X-Content-Type-Options', 'nosniff');
     }`,
    // non-member call expression
    `setHeader('X-Frame-Options');`,
    // computed member property
    `res['setHeader']('X-Frame-Options', 'DENY');`,
    // non-header method
    `res.json({});`,
  ],
  invalid: [
    // setHeader without arguments: header name cannot be extracted
    {
      code: `res.setHeader();`,
      errors: [{ messageId: 'missingSecurityHeader' }],
    },
    // function declaration scope with only one of the required headers
    {
      code: `function handler(req, res) { res.setHeader('X-Frame-Options', 'DENY'); }`,
      errors: [{ messageId: 'missingSecurityHeader' }],
    },
    // function expression scope
    {
      code: `const h = function (req, res) { res.header('X-Frame-Options', 'DENY'); };`,
      errors: [{ messageId: 'missingSecurityHeader' }],
    },
    // arrow function scope
    {
      code: `const h = (req, res) => { res.set('X-Frame-Options', 'DENY'); };`,
      errors: [{ messageId: 'missingSecurityHeader' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-postmessage-innerhtml
// ---------------------------------------------------------------------------
ruleTester.run('no-postmessage-innerhtml (coverage)', noPostmessageInnerhtml, {
  valid: [
    `window.addEventListener('message', handleMessage);`,
    `window.addEventListener('message', () => { refresh(); });`,
    `window.addEventListener('message', ({ data }) => { el.textContent = data; });`,
    `window.addEventListener('message', (event) => { el.innerHTML = other; });`,
  ],
  invalid: [
    // bare event identifier assigned to innerHTML
    {
      code: `window.addEventListener('message', (event) => { el.innerHTML = event; });`,
      errors: [{ messageId: 'unsafeInnerhtml' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-postmessage-wildcard-origin
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-postmessage-wildcard-origin (coverage)',
  noPostmessageWildcardOrigin,
  {
    valid: [
      // spread element inside options object is skipped
      `w.postMessage(data, { ...opts });`,
    ],
    invalid: [],
  },
);

// ---------------------------------------------------------------------------
// no-sensitive-cookie-js
// ---------------------------------------------------------------------------
ruleTester.run('no-sensitive-cookie-js (coverage)', noSensitiveCookieJs, {
  valid: [
    `x = y;`,
    `a.b.cookie = 'token=v';`,
    `document.title = 'token=v';`,
    // no key=value shape -> extractCookieKey returns null
    `document.cookie = 'noequalsign';`,
    // binary expression with non-literal left side
    `document.cookie = a + b;`,
  ],
  invalid: [
    // 'token' is a BEARER credential and belongs to no-cookie-auth-tokens now;
    // this rule owns the non-bearer half of the cookie vocabulary.
    {
      code: `document.cookie = 'api_key=' + value;`,
      errors: [{ messageId: 'sensitiveCookieJs' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-sensitive-data-in-analytics
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-sensitive-data-in-analytics (coverage)',
  noSensitiveDataInAnalytics,
  {
    valid: [
      `analytics.track('evt');`,
      `analytics.track('evt', data);`,
      `analytics.track('evt', { ...props });`,
      `analytics.track('evt', { ['email']: x });`,
    ],
    invalid: [],
  },
);

// ---------------------------------------------------------------------------
// no-sensitive-data-in-cache
// ---------------------------------------------------------------------------
ruleTester.run('no-sensitive-data-in-cache (coverage)', noSensitiveDataInCache, {
  valid: [
    `cache['set']('password', x);`,
    `cache.remove('password');`,
    `cache.set();`,
    `cache.set(key);`,
    `cache.set(null);`,
    `cache.set(123);`,
    // None of the above is a Cache. A Cache comes from caches.open().
    `cache.put('/api/me/ssn', res);`,
  ],
  invalid: [
    {
      code: `const c = await caches.open('v1'); c.put('/api/me/ssn', res);`,
      errors: [{ messageId: 'sensitiveInCache' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-sensitive-indexeddb
// ---------------------------------------------------------------------------
ruleTester.run('no-sensitive-indexeddb (coverage)', noSensitiveIndexeddb, {
  valid: [
    `db.createObjectStore();`,
    `db.createObjectStore(storeName);`,
    `store.add(record);`,
    `store.put();`,
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// no-sensitive-localstorage
// ---------------------------------------------------------------------------
ruleTester.run('no-sensitive-localstorage (coverage)', noSensitiveLocalstorage, {
  valid: [
    `localStorage.setItem();`,
    `localStorage.setItem(someKey, v);`,
    `x = y;`,
    `foo['token'] = v;`,
    `localStorage[idx] = v;`,
    `localStorage[0] = v;`,
    // sessionStorage excluded when checkSessionStorage is false
    {
      code: `sessionStorage['token'] = v;`,
      options: [{ checkSessionStorage: false }],
    },
  ],
  invalid: [
    {
      code: `localStorage[secretKey] = v;`,
      errors: [{ messageId: 'sensitiveLocalStorage' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-sensitive-sessionstorage
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-sensitive-sessionstorage (coverage)',
  noSensitiveSessionstorage,
  {
    valid: [
      `sessionStorage.setItem();`,
      `sessionStorage.setItem(someKey, v);`,
      `x = y;`,
      `foo['token'] = v;`,
      `a.b['token'] = v;`,
      `sessionStorage[someKey] = v;`,
      `sessionStorage[0] = v;`,
    ],
    invalid: [
      // additional pattern option exercises the RegExp mapping
      {
        code: `sessionStorage.setItem('companyBadge', v);`,
        options: [{ additionalPatterns: ['badge'] }],
        errors: [{ messageId: 'sensitiveInSessionStorage' }],
      },
      // identifier key matching a sensitive pattern
      {
        code: `sessionStorage.setItem(passwordKey, v);`,
        errors: [{ messageId: 'sensitiveInSessionStorage' }],
      },
      // computed identifier property on assignment
      {
        code: `sessionStorage[passwordKey] = v;`,
        errors: [{ messageId: 'sensitiveInSessionStorage' }],
      },
    ],
  },
);

// ---------------------------------------------------------------------------
// no-tracking-without-consent
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-tracking-without-consent (coverage)',
  noTrackingWithoutConsent,
  {
    valid: [
      // ConditionalExpression counts as a consent check
      `consentGiven ? gtag('event', 'x') : null;`,
      `consentGiven ? analytics.track('x') : null;`,
    ],
    invalid: [],
  },
);

// ---------------------------------------------------------------------------
// no-unencrypted-transmission
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-unencrypted-transmission (coverage)',
  noUnencryptedTransmission,
  {
    valid: [
      // secure variant present alongside insecure protocol text
      `const u = 'see http:// vs https:// docs';`,
      // non-string literal
      `const n = 42;`,
      // ignore pattern on template literals
      {
        code: `const t = \`ftp://legacy.example.com\`;`,
        options: [{ ignorePatterns: ['ftp'] }],
      },
      // localhost allowance in test files
      {
        code: `const u = 'http://localhost:3000';`,
        options: [{ allowInTests: true, insecureProtocols: ['http://'] }],
        filename: 'net.test.ts',
      },
    ],
    invalid: [
      // invalid-regex ignore pattern falls through to reporting
      {
        code: `const u = 'http://prod.example.com';`,
        options: [{ ignorePatterns: ['['], insecureProtocols: ['http://'] }],
        errors: [
          {
            messageId: 'unencryptedTransmission',
            suggestions: [
              {
                messageId: 'useHttps',
                output: `const u = "https://prod.example.com";`,
              },
            ],
          },
        ],
      },
      // custom protocol without a secure alternative (literal)
      {
        code: `const u = 'gopher://host';`,
        options: [{ insecureProtocols: ['gopher://'] }],
        errors: [{ messageId: 'unencryptedTransmission' }],
      },
      // custom protocol without a secure alternative (template quasi)
      {
        code: `const t = \`gopher://host/\${p}\`;`,
        options: [{ insecureProtocols: ['gopher://'] }],
        errors: [{ messageId: 'unencryptedTransmission' }],
      },
      // insecure URL in a test file without localhost
      {
        code: `const u = 'http://prod.example.com';`,
        options: [{ allowInTests: true, insecureProtocols: ['http://'] }],
        filename: 'net.test.ts',
        errors: [
          {
            messageId: 'unencryptedTransmission',
            suggestions: [
              {
                messageId: 'useHttps',
                output: `const u = "https://prod.example.com";`,
              },
            ],
          },
        ],
      },
    ],
  },
);

// ---------------------------------------------------------------------------
// no-unescaped-url-parameter
// ---------------------------------------------------------------------------
ruleTester.run('no-unescaped-url-parameter (coverage)', noUnescapedUrlParameter, {
  valid: [
    // allowInTests short-circuits create() entirely
    {
      code: `const a = \`https://x.example.com/v1?q=\${req.query.id}\`;`,
      options: [{ allowInTests: true }],
      filename: 'url.test.ts',
    },
    // a `+` chain that builds no URL at all
    `const s = a + b;`,
    // user ignorePatterns, both visitors
    {
      code: `const u = 'https://x.example.com/v1?q=' + req.query.id;`,
      options: [{ ignorePatterns: ['req\\.query'] }],
    },
    {
      code: `const u = \`https://x.example.com/v1?q=\${req.query.id}\`;`,
      options: [{ ignorePatterns: ['req\\.query'] }],
    },
    // an unparseable user pattern is discarded rather than thrown
    {
      code: `const u = \`https://x.example.com/v1?q=\${encodeURIComponent(req.query.id)}\`;`,
      options: [{ ignorePatterns: ['('] }],
    },
    // trustedLibraries, resolved through the import graph
    {
      code: `import url from 'url'; const u = \`https://x.example.com/v1?q=\${url.format(req.query.id)}\`;`,
    },
    // a member read that is neither a URL source nor a DOM read
    `const u = \`https://x.example.com/v1?a=\${obj.prop}\`;`,
    // every Location write belongs to no-insecure-redirects now
    `window.location = req.query.next;`,
    `location = req.query.next;`,
    `document.location.href = req.query.next;`,
    // a tagged template is the tag's business
    'const u = tag`https://x.example.com/v1?q=${req.query.id}`;',
    // the hole chooses the host — the open-redirect family's finding
    `const u = \`https://\${req.query.host}/v1\`;`,
    // relative text that reaches no URL sink
    `export function key(id) { return \`/items/\${id}\`; }`,
    // a relative URL whose binding is re-assigned before the sink
    `export function key(id) { let u = \`/items?id=\${id}\`; u = '/items'; return fetch(u); }`,
    // arithmetic, not concatenation
    `export function page(n) { return \`https://x.example.com/v1?p=\${n + 1}\`; }`,
    // a closed parameter type
    `export function s(d: 'asc' | 'desc') { return \`https://x.example.com/v1?d=\${d}\`; }`,
    // a module-private helper's parameter is knowable
    `function k(id) { return \`https://x.example.com/v1?id=\${id}\`; } export const A = k('a');`,
    // a cyclic binding terminates
    `export function c() { const a = a; return \`https://x.example.com/v1?q=\${a}\`; }`,
    // a spread argument in a passthrough position
    `export function s(parts) { return \`https://x.example.com/v1?q=\${String(...parts)}\`; }`,
    // a passthrough global called with no argument at all
    `export function s() { return \`https://x.example.com/v1?q=\${String()}\`; }`,
    // a computed location key that is not a static string
    `export function f(k) { return \`https://x.example.com/v1?q=\${location[k]}\`; }`,
    // a computed key that is a NUMERIC literal, not a property name
    `const u = \`https://x.example.com/v1?q=\${location[0]}\`;`,
    // a private field: a non-computed property that is not an Identifier
    `class C { #v = 'x'; url() { return \`https://x.example.com/v1?q=\${this.#v}\`; } }`,
    // `.current` on a member expression is not a React ref
    `const u = \`https://x.example.com/v1?q=\${a.b.current.value}\`;`,
    // a cyclic ref binding terminates
    `const r = r; const u = \`https://x.example.com/v1?q=\${r.current.value}\`;`,
    // a bare call is not a document query
    `const u = \`https://x.example.com/v1?q=\${pick().value}\`;`,
    // a document method that does not return an element
    `const u = \`https://x.example.com/v1?q=\${document.createElement('input').value}\`;`,
    // `.value` reached through an ordinary property
    `const u = \`https://x.example.com/v1?q=\${obj.prop.value}\`;`,
    // `.target` on a member expression rather than a parameter
    `const u = \`https://x.example.com/v1?q=\${a.b.target.value}\`;`,
    // a cyclic element binding terminates
    `const el = el; const u = \`https://x.example.com/v1?q=\${el.value}\`;`,
    // a cyclic FormData binding terminates
    `const d = d; const u = \`https://x.example.com/v1?q=\${d.get('e')}\`;`,
    // `.searchParams` on something that is not a parsed URL
    `const u = \`https://x.example.com/v1?q=\${cfg.searchParams.get('a')}\`;`,
    // a reader on a URL container that is not a stringifier
    `const p = new URL(location.href); const u = \`https://x.example.com/v1?q=\${p.at(0)}\`;`,
    // a computed reader whose key is not a static string
    `export function f(m) { const p = new URLSearchParams(location.search); return \`https://x.example.com/v1?q=\${p[m]('n')}\`; }`,
    // the constructor resolved as a DECLARED global rather than an unknown name
    {
      code: `class URLSearchParams { get(k) { return k; } } const d = new URLSearchParams(); const u = \`https://x.example.com/v1?q=\${d.get('a')}\`;`,
    },
    // a shadowed sink global: this `fetch` is the module's own
    `const fetch = (x) => x; export function f(q) { return fetch(\`/v1?q=\${q}\`); }`,
    // a JSX expression container that is a CHILD, not an attribute
    {
      code: `export function A({ q }) { return <div>{\`/v1?q=\${q}\`}</div>; }`,
      filename: 'child.tsx',
    },
    // an arrow in a JSX child position is not an installed handler
    {
      code: `export function A() { return <div>{(e) => fetch(\`https://x.example.com/v1?q=\${e.target.value}\`)}</div>; }`,
      filename: 'child.tsx',
    },
    // `.value` on something that is not a DOM element at all
    `const u = \`https://x.example.com/v1?q=\${'s'.value}\`;`,
    // no path/query/fragment delimiter after the authority
    `export function t(p) { return \`https://x.example.com\${p}\`; }`,
    // a template with no static text is not a URL
    `export function t(p) { return \`\${p}\`; }`,
    // an unresolvable `.current` is not a React ref
    `export function C(r) { return fetch(\`https://x.example.com/v1?q=\${r.current.value}\`); }`,
    // `.current` on a call into a module that is not React
    `import { box } from 'other'; export function C() { const r = box(); return fetch(\`https://x.example.com/v1?q=\${r.current.value}\`); }`,
    // an axios-shaped call whose second argument is the template
    `import axios from 'axios'; export function f(q) { return axios.post('/v1', \`/v1?q=\${q}\`); }`,
    // `.open` on argument zero is not the XHR URL position
    `export function f(q) { return db.open(\`/v1?q=\${q}\`); }`,
    // a computed member with a non-static key inside a DOM chain, un-resolvable
    `export function f(i) { const n = pool[i]; return \`https://x.example.com/v1?q=\${n.value}\`; }`,
  ],
  invalid: [
    // template and concatenation, both with a proven source
    {
      code: `const u = \`https://x.example.com/v1?q=\${req.query.id}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    {
      code: `const u = 'https://x.example.com/v1?q=' + req.query.id;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // a static prefix reached through a const binding
    {
      code: `const BASE = 'https://x.example.com'; const u = BASE + '/v1?q=' + req.query.id;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // ternary and logical arms
    {
      code: `const u = \`https://x.example.com/v1?q=\${flag ? req.query.a : 'x'}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    {
      code: `const u = \`https://x.example.com/v1?q=\${req.query.a || 'x'}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // TS syntax wrappers around the same source
    {
      code: `const u = \`https://x.example.com/v1?q=\${req.query.a as string}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    {
      code: `const u = \`https://x.example.com/v1?q=\${req.query.a!}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // await, and an optional-chained passthrough
    {
      code: `async function f() { return \`https://x.example.com/v1?q=\${await req.query.a}\`; }`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    {
      code: `const u = \`https://x.example.com/v1?q=\${location.hash?.slice(1)}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // a computed member with a non-literal key inside a proven DOM chain
    {
      code: `const f = document.querySelectorAll('input'); const i = 0; const u = \`https://x.example.com/v1?q=\${f[i].value}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // a template literal as an operand of a `+` chain: analysed once, from the
    // chain, and not a second time from the template
    {
      code: `const u = 'https://x.example.com/v1?q=' + \`\${req.query.a}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // the RIGHT operand of a `+` inside a hole
    {
      code: `const u = \`https://x.example.com/v1?q=\${'a' + req.query.b}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // the RIGHT arm of a logical, and the ALTERNATE of a ternary
    {
      code: `const u = \`https://x.example.com/v1?q=\${'x' || req.query.a}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    {
      code: `const u = \`https://x.example.com/v1?q=\${flag ? 'x' : req.query.a}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // a passthrough global over a source only THIS question can see
    {
      code: `export function s(q) { return \`https://x.example.com/v1?q=\${String(q)}\`; }`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // the passthrough-global branch with a real argument
    {
      code: `const u = \`https://x.example.com/v1?q=\${String(location.search)}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // the environment's own `URLSearchParams`, declared as a global
    {
      code: `const p = new URLSearchParams(location.search); const u = \`https://x.example.com/v1?q=\${p.get('n')}\`;`,
      languageOptions: { globals: { URLSearchParams: 'readonly' } },
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // a `URL` container stringified back to the absolute URL it holds
    {
      code: `const p = new URL(location.href); const u = \`https://x.example.com/v1?q=\${p.toString()}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // a params reader spelled with a bracket
    {
      code: `const p = new URLSearchParams(location.search); const u = \`https://x.example.com/v1?q=\${p['get']('n')}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // a nested template inside the hole
    {
      code: 'const u = `https://x.example.com/v1?q=${`${req.query.a}`}`;',
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // el.oninput = handler — the member-write handler position
    {
      code: `const el = document.querySelector('#q'); el.oninput = (e) => fetch(\`https://x.example.com/v1?q=\${e.target.value}\`);`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // a class PropertyDefinition arrow on an exported class
    {
      code: `export class C { build = (q) => \`https://x.example.com/v1?q=\${q}\`; }`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // a template-literal TYPE is not a closed set
    {
      code: 'export function s(id: `x-${string}`) { return `https://x.example.com/v1?q=${id}`; }',
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // Request, axios and the JSX attribute sinks, over relative text
    {
      code: `export function f(q) { return new Request(\`/v1?q=\${q}\`); }`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    {
      code: `import axios from 'axios'; export function f(q) { return axios.get(\`/v1?q=\${q}\`); }`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    {
      code: `export function A({ q }) { return <a href={\`/v1?q=\${q}\`}>x</a>; }`,
      filename: 'link.tsx',
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-unsafe-eval-csp / no-unsafe-inline-csp
// ---------------------------------------------------------------------------
ruleTester.run('no-unsafe-eval-csp (coverage)', noUnsafeEvalCsp, {
  valid: [`const n = 42;`],
  invalid: [],
});

ruleTester.run('no-unsafe-inline-csp (coverage)', noUnsafeInlineCsp, {
  valid: [`const n = 42;`],
  invalid: [],
});

// ---------------------------------------------------------------------------
// no-websocket-eval
// ---------------------------------------------------------------------------
ruleTester.run('no-websocket-eval (coverage)', noWebsocketEval, {
  valid: [
    `const ws = new WebSocket('wss://example.test'); ws.onmessage = handleMessage;`,
    `const ws = new WebSocket('wss://example.test'); ws.onmessage = () => { poll(); };`,
    `const ws = new WebSocket('wss://example.test'); ws.onmessage = ({ data }) => { parse(data); };`,
    `const ws = new WebSocket('wss://example.test'); ws.addEventListener('open', (e) => { ready(e); });`,
    `const ws = new WebSocket('wss://example.test'); ws.addEventListener(evtName, (e) => { ready(e); });`,
    `const ws = new WebSocket('wss://example.test'); ws.addEventListener('message', handleMessage);`,
    `const ws = new WebSocket('wss://example.test'); ws.addEventListener('message', () => { poll(); });`,
    `const ws = new WebSocket('wss://example.test'); ws.addEventListener('message', ({ data }) => { parse(data); });`,
    // eval of something unrelated to the event parameter
    `const ws = new WebSocket('wss://example.test'); ws.onmessage = (e) => { eval(other); };`,
    // member-expression eval-like callee is not an eval call
    `const ws = new WebSocket('wss://example.test'); ws.onmessage = (e) => { obj.eval(e.data); };`,
    // new Function outside any handler
    `const f = new Function('return 1');`,
    // new expression with non-Function callee inside handler
    `const ws = new WebSocket('wss://example.test'); ws.onmessage = (e) => { const p = new Foo(e.data); };`,
    // new Function with static arguments inside handler
    `const ws = new WebSocket('wss://example.test'); ws.onmessage = (e) => { const f = new Function('return 1'); };`,
  ],
  invalid: [
    // bare event identifier passed to eval
    {
      code: `const ws = new WebSocket('wss://example.test'); ws.onmessage = (e) => { eval(e); };`,
      errors: [{ messageId: 'evalWithWsData' }],
    },
    // Function() called as a plain function with event data
    {
      code: `const ws = new WebSocket('wss://example.test'); ws.onmessage = (e) => { Function(e.data); };`,
      errors: [{ messageId: 'evalWithWsData' }],
    },
    // new Function with event data
    {
      code: `const ws = new WebSocket('wss://example.test'); ws.onmessage = (e) => { const f = new Function(e.data); };`,
      errors: [{ messageId: 'evalWithWsData' }],
    },
    // nested event data member expression
    {
      code: `const ws = new WebSocket('wss://example.test'); ws.onmessage = (e) => { eval(e.data.payload); };`,
      errors: [{ messageId: 'evalWithWsData' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-websocket-innerhtml
// ---------------------------------------------------------------------------
ruleTester.run('no-websocket-innerhtml (coverage)', noWebsocketInnerhtml, {
  valid: [
    `const ws = new WebSocket('wss://example.test'); ws.onmessage = handleMessage;`,
    `const ws = new WebSocket('wss://example.test'); ws.onmessage = () => { poll(); };`,
    `const ws = new WebSocket('wss://example.test'); ws.onmessage = ({ data }) => { el.textContent = data; };`,
    `const ws = new WebSocket('wss://example.test'); ws.addEventListener('open', (e) => { ready(e); });`,
    `const ws = new WebSocket('wss://example.test'); ws.addEventListener(evtName, (e) => { ready(e); });`,
    `const ws = new WebSocket('wss://example.test'); ws.addEventListener('message', handleMessage);`,
    `const ws = new WebSocket('wss://example.test'); ws.addEventListener('message', () => { poll(); });`,
    `const ws = new WebSocket('wss://example.test'); ws.addEventListener('message', ({ data }) => { el.textContent = data; });`,
  ],
  invalid: [
    {
      code: `const ws = new WebSocket('wss://example.test'); ws.addEventListener('message', (e) => { el.innerHTML = e.data; });`,
      errors: [{ messageId: 'unsafeInnerhtml' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-worker-message-innerhtml
// ---------------------------------------------------------------------------
ruleTester.run(
  'no-worker-message-innerhtml (coverage)',
  noWorkerMessageInnerhtml,
  {
    valid: [
      // member-expression object for onmessage
      `a.b.onmessage = (e) => { el.innerHTML = e.data; };`,
      // object name does not look like a worker
      `thing.onmessage = (e) => { el.innerHTML = e.data; };`,
      `const worker = new Worker('worker.js'); worker.onmessage = handleMessage;`,
      `const worker = new Worker('worker.js'); worker.onmessage = () => { poll(); };`,
      `const worker = new Worker('worker.js'); worker.onmessage = ({ data }) => { el.textContent = data; };`,
      `const worker = new Worker('worker.js'); worker.addEventListener('error', (e) => { log(e); });`,
      `const worker = new Worker('worker.js'); worker.addEventListener(evtName, (e) => { log(e); });`,
      // addEventListener object that is not worker-like
      `thing.addEventListener('message', (e) => { el.innerHTML = e.data; });`,
      `w.addEventListener('message', handleMessage);`,
      `wk.addEventListener('message', () => { poll(); });`,
      `const worker = new Worker('worker.js'); worker.addEventListener('message', ({ data }) => { el.textContent = data; });`,
      // member expression that never references event data
      `const worker = new Worker('worker.js'); worker.onmessage = (e) => { el.innerHTML = x.data; };`,
    ],
    invalid: [
      // nested member expression resolved recursively
      {
        code: `const worker = new Worker('worker.js'); worker.onmessage = (e) => { el.innerHTML = e.data.html; };`,
        errors: [{ messageId: 'workerInnerhtml' }],
      },
      // dangerous method call sink inside handler
      {
        code: `const worker = new Worker('worker.js'); worker.onmessage = (e) => { el.insertAdjacentHTML('beforeend', e.data); };`,
        errors: [{ messageId: 'workerInnerhtml' }],
      },
      // short worker aliases via addEventListener
      {
        code: `const w = new Worker('worker.js'); w.addEventListener('message', (e) => { el.innerHTML = e.data; });`,
        errors: [{ messageId: 'workerInnerhtml' }],
      },
      {
        code: `const wk = new Worker('worker.js'); wk.addEventListener('message', (e) => { el.innerHTML = e.data; });`,
        errors: [{ messageId: 'workerInnerhtml' }],
      },
    ],
  },
);

// ---------------------------------------------------------------------------
// require-blob-url-revocation
// ---------------------------------------------------------------------------
ruleTester.run('require-blob-url-revocation (coverage)', requireBlobUrlRevocation, {
  valid: [
    // Not the platform's URL — a lookalike with the same method name.
    `const fake = { createObjectURL: (b) => 'blob:' + b.size };\nconst u = fake.createObjectURL(blob);`,
    // A helper that returns the handle delegates release to its caller.
    `function make(b) { return URL.createObjectURL(b); }`,
  ],
  invalid: [
    // "bare createObjectURL call is not tracked" was asserted VALID. A handle
    // stored nowhere at all can never be revoked — it is the worst case, not
    // the exempt one.
    {
      code: `URL.createObjectURL(blob);`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // Same: a destructured target holds no handle anything can revoke.
    {
      code: `const { href } = URL.createObjectURL(blob);`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // revokeObjectURL without arguments does not revoke anything
    {
      code: `const u = URL.createObjectURL(blob); URL.revokeObjectURL();`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // revokeObjectURL on a DIFFERENT path than the one created
    {
      code: `const u = URL.createObjectURL(blob); URL.revokeObjectURL(x.y);`,
      errors: [{ messageId: 'missingRevoke' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// require-cookie-secure-attrs
// ---------------------------------------------------------------------------
ruleTester.run('require-cookie-secure-attrs (coverage)', requireCookieSecureAttrs, {
  valid: [
    `x = 'a=b';`,
    `foo.cookie = 'a=b';`,
    `document.foo = 'a=b';`,
  ],
  invalid: [
    // `document['cookie']` is the SAME sink. This used to be asserted VALID.
    {
      code: `document['cookie'] = 'a=b';`,
      errors: [{ messageId: 'missingSecure' }, { messageId: 'missingSameSite' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// require-csp-headers
// ---------------------------------------------------------------------------
ruleTester.run('require-csp-headers (coverage)', requireCspHeaders, {
  valid: [
    `res.send(\`\`);`,
    `res.send(\`plain text\`);`,
    `res.send('plain text');`,
    `res.send(42);`,
    `res.send();`,
    `res.json(x);`,
    `send(html);`,
  ],
  invalid: [
    // DOCTYPE arm on template literals
    {
      code: `res.send(\`<!DOCTYPE html><p>x</p>\`);`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // <html arm on template literals
    {
      code: `res.send(\`<html></html>\`);`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // DOCTYPE arm on string literals
    {
      code: `res.send('<!DOCTYPE html><p>x</p>');`,
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// require-https-only
// ---------------------------------------------------------------------------
ruleTester.run('require-https-only (coverage)', requireHttpsOnly, {
  valid: [
    `fetch();`,
    `axios.get();`,
    `axios.custom('http://x.example.com');`,
    `other.get('http://x.example.com');`,
    `fetch(url);`,
    `fetch(42);`,
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// require-mime-type-validation
// ---------------------------------------------------------------------------
ruleTester.run('require-mime-type-validation (coverage)', requireMimeTypeValidation, {
  valid: [
    `foo.bar('file');`,
    // `upload` is not resolvable to multer here, so there is no evidence.
    `upload.single('file');`,
    `import multer from 'multer';\nmulter({ fileFilter: f }).single('file');`,
    // The `upload(...)` detector matched a CALLEE'S SPELLING and reported it at
    // CWE-434 / CVSS 8.8. Both of these were asserted as true positives.
    `upload();`,
    `upload(file);`,
    `upload('literal.png');`,
  ],
  invalid: [
    {
      code: `import multer from 'multer';\nmulter({ storage: s }).single('file');`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: `import multer from 'multer';\nmulter().single('file');`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      // `limits` caps file SIZE. It was accepted as MIME validation.
      code: `import multer from 'multer';\nmulter({ limits: l }).array('files');`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      // A config the rule cannot inspect is not a config that validates.
      code: `import multer from 'multer';\nmulter(config).single('file');`,
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// require-postmessage-origin-check
// ---------------------------------------------------------------------------
ruleTester.run(
  'require-postmessage-origin-check (coverage)',
  requirePostmessageOriginCheck,
  {
    valid: [
      `addEventListener();`,
      `addEventListener(evtName, handler);`,
      `addEventListener('click', handler);`,
      `window.addEventListener('message');`,
      `window.addEventListener('message', handlerRef);`,
    ],
    invalid: [],
  },
);

// ---------------------------------------------------------------------------
// require-url-validation
// ---------------------------------------------------------------------------
ruleTester.run('require-url-validation (coverage)', requireUrlValidation, {
  valid: [
    `foo.open(url);`,
    `window.close(url);`,
    `open(url);`,
  ],
  invalid: [],
});

// ---------------------------------------------------------------------------
// require-websocket-wss
// ---------------------------------------------------------------------------
ruleTester.run('require-websocket-wss (coverage)', requireWebsocketWss, {
  valid: [
    `new WebSocket();`,
    // localhost template literal allowed by default
    `new WebSocket(\`ws://localhost:3000\`);`,
  ],
  invalid: [
    // template localhost still reported when allowLocalhost is false
    {
      code: `new WebSocket(\`ws://localhost:3000\`);`,
      options: [{ allowLocalhost: false }],
      errors: [
        {
          messageId: 'insecureWebsocket',
          suggestions: [
            {
              messageId: 'useWss',
              output: `new WebSocket(\`wss://localhost:3000\`);`,
            },
          ],
        },
      ],
    },
  ],
});
