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
    // template with style but no transparent styles
    { code: `const t = \`style color: red\`;`, filename: 'lib.ts' },
    // window.self member access (property not location/top)
    { code: `const s = window.self;`, filename: 'lib.ts' },
  ],
  invalid: [
    // entry-point + <button UI -> missing frame busting
    {
      code: `export const App = () => <button onClick={go}>hi</button>;`,
      filename: 'app.tsx',
      errors: [{ messageId: 'missingFrameBusting' }],
    },
    // entry-point + <form UI arm
    {
      code: `export const Page = () => <form onSubmit={s}></form>;`,
      filename: 'main.jsx',
      errors: [{ messageId: 'missingFrameBusting' }],
    },
    // entry-point + <input UI arm
    {
      code: `export const Page = () => <input />;`,
      filename: 'pages/settings.tsx',
      errors: [{ messageId: 'missingFrameBusting' }],
    },
    // entry-point + onClick + '<' arm (no button/form/input)
    {
      code: `export const Page = () => <div onClick={h}></div>;`,
      filename: 'layout.tsx',
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
      code: `const css = 'css display: none';`,
      filename: 'lib.ts',
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
    {
      code: `const css = 'css z-index: -1';`,
      filename: 'lib.ts',
      errors: [{ messageId: 'transparentFrameOverlay' }],
    },
    {
      code: `const css = 'css position: absolute top: 0 left: 0';`,
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
    `document['cookie'] = 'accessToken=x';`,
    `document.cookie = 42;`,
    `document.cookie = 'theme=' + theme;`,
  ],
  invalid: [
    {
      code: `document.cookie = 'accessToken=' + token;`,
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
    // computed Literal property that is NOT in DANGEROUS_FUNCTIONS
    // ('Function' is only flagged via `new Function`, not bracket calls)
    `globalThis['Function']('code');`,
  ],
  invalid: [
    {
      code: `window['eval']('code');`,
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
    `obj.reader.onload = (e) => { el.innerHTML = e.target.result; };`,
    // handler is an identifier reference
    `reader.onload = handleLoad;`,
    // handler without parameters
    `reader.onload = () => { el.innerHTML = window.cached; };`,
    // destructured handler parameter
    `reader.onload = ({ target }) => { use(target); };`,
    // addEventListener with non-load event
    `reader.addEventListener('error', (e) => { report(e); });`,
    // addEventListener with dynamic event name
    `reader.addEventListener(evtName, (e) => { report(e); });`,
    // addEventListener with identifier callback
    `reader.addEventListener('load', handleLoad);`,
    // addEventListener callback without params
    `reader.addEventListener('load', () => { done(); });`,
    // addEventListener destructured param
    `reader.addEventListener('load', ({ target }) => { use(target); });`,
    // member access that never reaches reader result
    `reader.onload = (e) => { el.innerHTML = e.target.foo; };`,
  ],
  invalid: [
    // loadend event arm
    {
      code: `reader.addEventListener('loadend', (e) => { el.innerHTML = e.target.result; });`,
      errors: [{ messageId: 'unsafeInnerhtml' }],
    },
    // deeply nested member expression resolved recursively
    {
      code: `reader.onload = (e) => { el.innerHTML = e.target.result.data; };`,
      errors: [{ messageId: 'unsafeInnerhtml' }],
    },
    // dangerous method call sink inside handler
    {
      code: `reader.onload = (e) => { el.insertAdjacentHTML('beforeend', e.target.result); };`,
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
      code: `const u = 'http://example.com:8080/a';`,
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
      code: `const u = 'http://example.com:9999/a';`,
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
    `el['innerHTML'] = userInput;`,
    `el.title = userInput;`,
    `write(userInput);`,
    `document['write'](userInput);`,
    `document.getElementById('a');`,
    `document.write();`,
    // literal strings allowed by default
    `document.write('<b>hi</b>');`,
    // sanitized content
    `document.write(DOMPurify.sanitize(userInput));`,
  ],
  invalid: [
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
  ],
  invalid: [
    // non-WebSocket constructor: only the Literal visitor reports
    {
      code: `new Foo('ws://example.com');`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // member-expression callee: only the Literal visitor reports
    {
      code: `new a.WebSocket('ws://example.com');`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // template literal WebSocket URL (NewExpression check only)
    {
      code: `new WebSocket(\`ws://\${host}\`);`,
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
      code: `localStorage.setItem(k[0], 'eyJhbGciOi.eyJzdWIiOi.sig123');`,
      errors: [{ messageId: 'jwtInStorage' }],
    },
    // assignment with non-JWT key but JWT-shaped value
    {
      code: `localStorage['data'] = 'eyJhbGciOi.eyJzdWIiOi.sig123';`,
      errors: [{ messageId: 'jwtInStorage' }],
    },
    // computed dynamic key with JWT value -> '<dynamic>' data path
    {
      code: `localStorage[k.x] = 'eyJhbGciOi.eyJzdWIiOi.sig123';`,
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
    `app.post('/incomplete');`,
    // invalid regex ignore pattern falls back to includes() and matches
    {
      code: `app.post('(weird', handler);`,
      options: [{ ignorePatterns: ['('] }],
    },
  ],
  invalid: [
    // invalid regex ignore pattern that does not match falls through
    {
      code: `app.post('/a', handler);`,
      options: [{ ignorePatterns: ['['] }],
      errors: [
        {
          messageId: 'missingCsrfProtection',
          suggestions: [
            {
              messageId: 'addCsrfValidation',
              output: `app.post('/a', csrf(), handler);`,
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
    // non-literal header name
    {
      code: `res.setHeader(headerName, value);`,
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
    {
      code: `document.cookie = 'token=' + value;`,
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
  ],
  invalid: [],
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
        options: [{ allowInTests: true }],
        filename: 'net.test.ts',
      },
    ],
    invalid: [
      // invalid-regex ignore pattern falls through to reporting
      {
        code: `const u = 'http://prod.example.com';`,
        options: [{ ignorePatterns: ['['] }],
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
        options: [{ allowInTests: true }],
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
    // allowInTests short-circuits all three visitors
    {
      code: `
        const a = \`https://x.example.com?q=\${req.query.id}\`;
        const b = 'https://x.example.com?q=' + req.query.id;
        window.location = req.query.next;
      `,
      options: [{ allowInTests: true }],
      filename: 'url.test.ts',
    },
    // binary concatenation that is not URL construction
    `const s = a + b;`,
    // ignore pattern in binary expression
    {
      code: `const u = 'https://x.example.com?q=' + req.query.id;`,
      options: [{ ignorePatterns: ['req\\.query'] }],
    },
    // encoded binary right side
    `const u = 'https://x.example.com?q=' + encodeURIComponent(req.query.id);`,
    // template expression routed through a trusted library
    `const u = \`https://x.example.com?q=\${url.format(input)}\`;`,
    // template ignore pattern
    {
      code: `const u = \`https://x.example.com?q=\${req.query.id}\`;`,
      options: [{ ignorePatterns: ['req\\.query'] }],
    },
    // encoded template expression
    `const u = \`https://x.example.com?q=\${encodeURIComponent(req.query.id)}\`;`,
    // member expression that is not user input
    `const u = \`https://x.example.com?a=\${obj.prop}\`;`,
    // location assignment with template right side is delegated
    `window.location = \`\${req.query.a}\`;`,
    // location assignment ignore pattern
    {
      code: `window.location = safeTarget;`,
      options: [{ ignorePatterns: ['^safetarget$'] }],
    },
    // location assignment through encoding call
    `window.location = encodeURIComponent(x);`,
    // identifier that traces to a self-reference (visited guard)
    `location = notDeclared;`,
    // identifier resolving to a function declaration (non-variable def)
    `function target() {} window.location = target;`,
    // identifier without initializer
    `let pendingTarget; window.location = pendingTarget;`,
  ],
  invalid: [
    // template full-text match arm (expression text alone is safe)
    {
      code: `const u = \`https://x.example.com?param=\${val}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // untrusted call around user input still reports
    {
      code: `const u = \`https://x.example.com?q=\${foo(userInput)}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // nested member callee around user input
    {
      code: `const u = \`https://x.example.com?q=\${a.b.c(userInput)}\`;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // direct user-controlled location assignment
    {
      code: `window.location = userInput;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // bare location identifier assignment
    {
      code: `location = req.query.next;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // document.location.href member-object arm
    {
      code: `document.location.href = userInput;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // identifier tracing through variable init
    {
      code: `const target = req.query.next; window.location = target;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // identifier tracing through template literal init
    {
      code: `const inner = req.body.q; const t = \`/p?x=\${inner}\`; window.location = t;`,
      errors: [{ messageId: 'unescapedUrlParameter' }],
    },
    // identifier tracing through binary concatenation init
    {
      code: `const leftPart = req.params.id; const combo = a + leftPart; window.location = combo;`,
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
    `ws.onmessage = handleMessage;`,
    `ws.onmessage = () => { poll(); };`,
    `ws.onmessage = ({ data }) => { parse(data); };`,
    `ws.addEventListener('open', (e) => { ready(e); });`,
    `ws.addEventListener(evtName, (e) => { ready(e); });`,
    `ws.addEventListener('message', handleMessage);`,
    `ws.addEventListener('message', () => { poll(); });`,
    `ws.addEventListener('message', ({ data }) => { parse(data); });`,
    // eval of something unrelated to the event parameter
    `ws.onmessage = (e) => { eval(other); };`,
    // member-expression eval-like callee is not an eval call
    `ws.onmessage = (e) => { obj.eval(e.data); };`,
    // new Function outside any handler
    `const f = new Function('return 1');`,
    // new expression with non-Function callee inside handler
    `ws.onmessage = (e) => { const p = new Foo(e.data); };`,
    // new Function with static arguments inside handler
    `ws.onmessage = (e) => { const f = new Function('return 1'); };`,
  ],
  invalid: [
    // bare event identifier passed to eval
    {
      code: `ws.onmessage = (e) => { eval(e); };`,
      errors: [{ messageId: 'evalWithWsData' }],
    },
    // Function() called as a plain function with event data
    {
      code: `ws.onmessage = (e) => { Function(e.data); };`,
      errors: [{ messageId: 'evalWithWsData' }],
    },
    // new Function with event data
    {
      code: `ws.onmessage = (e) => { const f = new Function(e.data); };`,
      errors: [{ messageId: 'evalWithWsData' }],
    },
    // nested event data member expression
    {
      code: `ws.onmessage = (e) => { eval(e.data.payload); };`,
      errors: [{ messageId: 'evalWithWsData' }],
    },
  ],
});

// ---------------------------------------------------------------------------
// no-websocket-innerhtml
// ---------------------------------------------------------------------------
ruleTester.run('no-websocket-innerhtml (coverage)', noWebsocketInnerhtml, {
  valid: [
    `ws.onmessage = handleMessage;`,
    `ws.onmessage = () => { poll(); };`,
    `ws.onmessage = ({ data }) => { el.textContent = data; };`,
    `ws.addEventListener('open', (e) => { ready(e); });`,
    `ws.addEventListener(evtName, (e) => { ready(e); });`,
    `ws.addEventListener('message', handleMessage);`,
    `ws.addEventListener('message', () => { poll(); });`,
    `ws.addEventListener('message', ({ data }) => { el.textContent = data; });`,
  ],
  invalid: [
    {
      code: `ws.addEventListener('message', (e) => { el.innerHTML = e.data; });`,
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
      `worker.onmessage = handleMessage;`,
      `worker.onmessage = () => { poll(); };`,
      `worker.onmessage = ({ data }) => { el.textContent = data; };`,
      `worker.addEventListener('error', (e) => { log(e); });`,
      `worker.addEventListener(evtName, (e) => { log(e); });`,
      // addEventListener object that is not worker-like
      `thing.addEventListener('message', (e) => { el.innerHTML = e.data; });`,
      `w.addEventListener('message', handleMessage);`,
      `wk.addEventListener('message', () => { poll(); });`,
      `worker.addEventListener('message', ({ data }) => { el.textContent = data; });`,
      // member expression that never references event data
      `worker.onmessage = (e) => { el.innerHTML = x.data; };`,
    ],
    invalid: [
      // nested member expression resolved recursively
      {
        code: `worker.onmessage = (e) => { el.innerHTML = e.data.html; };`,
        errors: [{ messageId: 'workerInnerhtml' }],
      },
      // dangerous method call sink inside handler
      {
        code: `worker.onmessage = (e) => { el.insertAdjacentHTML('beforeend', e.data); };`,
        errors: [{ messageId: 'workerInnerhtml' }],
      },
      // short worker aliases via addEventListener
      {
        code: `w.addEventListener('message', (e) => { el.innerHTML = e.data; });`,
        errors: [{ messageId: 'workerInnerhtml' }],
      },
      {
        code: `wk.addEventListener('message', (e) => { el.innerHTML = e.data; });`,
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
    // bare createObjectURL call is not tracked
    `URL.createObjectURL(blob);`,
    // destructured assignment is not tracked
    `const { href } = URL.createObjectURL(blob);`,
  ],
  invalid: [
    // revokeObjectURL without arguments does not revoke anything
    {
      code: `const u = URL.createObjectURL(blob); URL.revokeObjectURL();`,
      errors: [{ messageId: 'missingRevoke' }],
    },
    // revokeObjectURL with a non-identifier argument
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
    `document['cookie'] = 'a=b';`,
  ],
  invalid: [],
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
    `upload.single('file');`,
    `multer({ fileFilter: f }).single('file');`,
    `multer({ limits: l }).array('files');`,
    `multer(config).single('file');`,
    `upload('literal.png');`,
  ],
  invalid: [
    {
      code: `multer({ storage: s }).single('file');`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: `multer().single('file');`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: `upload();`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: `upload(file);`,
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
