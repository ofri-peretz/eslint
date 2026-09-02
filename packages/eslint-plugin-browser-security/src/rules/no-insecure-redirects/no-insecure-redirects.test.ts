/**
 * Comprehensive tests for no-insecure-redirects rule
 * Security: CWE-601 - Detects open redirect vulnerabilities
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import parser from '@typescript-eslint/parser';
import { noInsecureRedirects } from './index';

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

describe('no-insecure-redirects', () => {
  describe('Valid Code', () => {
    ruleTester.run('valid - validated redirects', noInsecureRedirects, {
      valid: [
        // Relative redirects
        { name: 'a literal in-app path', code: 'res.redirect("/dashboard");' },
        { code: 'res.redirect("../home");' },
        // Test files (if ignoreInTests is true)
        {
          code: 'res.redirect(req.query.url);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
        // Validated with isValidUrl
        {
          code: `
            const redirect = req.query.redirect;
            if (isValidUrl(redirect)) {
              res.redirect(redirect);
            }
          `,
        },
        // Validated with allowedDomains check
        {
          code: `
            const target = req.body.target;
            if (allowedDomains.includes(target)) {
              res.redirect(target);
            }
          `,
        },
      ],
      invalid: [
        // ---- Two cases that used to be asserted as VALID ------------------
        // Both were suppressed by a text scan over the previous five sibling
        // statements, and both are open redirects.
        //
        // A bare `validateUrl(url);` DISCARDS its result. Whatever the
        // function does, nothing in this program acts on the answer — and the
        // suppression did not depend on the function existing, only on it
        // being spelled from a four-name allowlist.
        {
          name: 'a redirect to a request-supplied URL',
          code: `
            const url = req.query.url;
            validateUrl(url);
            res.redirect(url);
          `,
          errors: [{ messageId: 'insecureRedirect' }],
        },
        // The same no-op shape, and the check itself is not a check:
        // `startsWith('https://')` constrains the SCHEME and says nothing at
        // all about the host, so `https://evil.test` passes it.
        {
          code: `
            const url = req.params.url;
            url.startsWith('https://');
            res.redirect(url);
          `,
          errors: [{ messageId: 'insecureRedirect' }],
        },
      ],
    });
  });

  describe('Invalid Code - Insecure Redirects', () => {
    ruleTester.run('invalid - unvalidated redirects', noInsecureRedirects, {
      valid: [],
      invalid: [
        { code: 'res.redirect(req.query.url);', errors: [{ messageId: 'insecureRedirect' }] },
        { code: 'res.redirect(req.body.redirectUrl);', errors: [{ messageId: 'insecureRedirect' }] },
        { code: 'window.location.href = req.params.url;', errors: [{ messageId: 'insecureRedirect' }] },
        // Using location.replace
        { code: 'location.replace(req.query.url);', errors: [{ messageId: 'insecureRedirect' }] },
        { code: 'location.assign(req.body.next);', errors: [{ messageId: 'insecureRedirect' }] },
        // The same four redirects, spelled with a string subscript — what a
        // minifier emits, and what anyone indexing by a constant writes.
        // Two of these DID report before: the `href` write and the `Location`
        // method already went through `staticKey`. The other two did not — the
        // `res.redirect` sink and the `.slice` that strips the leading `#`
        // each compared `property.name` before asking what the property WAS.
        // All four are pinned so the next refactor cannot re-open either half.
        { name: 'the same four redirects, spelled with a string subscript — what a minifier', code: 'res["redirect"](req.query.url);', errors: [{ messageId: 'insecureRedirect' }] },
        {
          name: 'a subscripted location.href write from a request parameter',
          code: 'window["location"]["href"] = req.params.url;',
          errors: [{ messageId: 'insecureRedirect' }],
        },
        { name: 'the same four redirects, spelled with a string subscript — what a minifier', code: 'location["replace"](req.query.url);', errors: [{ messageId: 'insecureRedirect' }] },
        {
          name: 'a subscripted assign fed by a subscripted hash slice',
          code: 'window.location["assign"](window.location.hash["slice"](1));',
          errors: [{ messageId: 'insecureRedirect' }],
        },
      ],
    });
  });

  describe('Options', () => {
    ruleTester.run('options - ignoreInTests', noInsecureRedirects, {
      valid: [
        {
          code: 'res.redirect(req.query.url);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
      ],
      invalid: [
        {
          code: 'res.redirect(req.query.url);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: false }],
          errors: [{ messageId: 'insecureRedirect' }],
        },
      ],
    });
  });
  describe('Corpus FP Regression — the sink is not the source', () => {
    ruleTester.run('corpus fp', noInsecureRedirects, {
      valid: [
        // ---- All 12 corpus findings, by shape. Every one of these reports on
        // the old predicate, which regexed `window.location` out of the
        // printed CALL TEXT — i.e. out of the navigation API being invoked.

        // okta-auth-js enrollAuthenticator.ts:32 — target built from SDK metadata.
        {
          code: `
            const requestUrl = meta.urls.authorizeUrl + buildAuthorizeParams(params);
            window.location.assign(requestUrl);
          `,
        },
        // okta-auth-js core/mixin.ts:96 — target is a function parameter.
        {
          code: `
            function restore(originalUri) { window.location.replace(originalUri); }
          `,
        },
        // okta-auth-js static-spa app.js:243 — same-origin by construction.
        // `location.origin` is the CURRENT origin, so echoing it cannot
        // retarget anyone.
        {
          code: `
            const newUri = window.location.origin + '/' + query;
            window.location.replace(newUri);
          `,
        },
        // okta-auth-js session/api.ts:65 — the issuer origin leads the
        // concatenation, so nothing appended after it can move the target.
        {
          code: `
            function setCookieAndRedirect(sdk, sessionToken, redirectUrl) {
              redirectUrl = redirectUrl || window.location.href;
              window.location.assign(sdk.getIssuerOrigin() + '/login/sessionCookieRedirect' +
                toQueryString({ token: sessionToken, redirectUrl: redirectUrl }));
            }
          `,
        },
        // okta-auth-js oidc/factory/api.ts:52 — `Object.assign` is not a
        // navigation. The old rule matched the bare method name `assign`.
        {
          code: `
            const parseFromUrlApi = Object.assign(parseFromUrlFn, {
              _getLocation: function() { return window.location; },
            });
          `,
        },
        // The same confusion on `replace`.
        {
          code: `const clean = window.location.href.replace('#', '');`,
        },
        // okta-signin-widget interactionCodeFlow.js:40 — configured redirectUri.
        {
          code: `
            const redirectUri = settings.get('redirectUri');
            window.location.assign(redirectUri + qs);
          `,
        },
        // okta-signin-widget LaunchAuthenticatorButton.tsx:64 — call result.
        {
          code: `window.location.assign(setUrlQueryParams(urlObj, loginHintQueryParam));`,
        },
      ],
      invalid: [
        // ---- FN locks: the genuine open-redirect shapes still report.

        // The classic: the address-bar fragment steers the navigation.
        {
          code: `window.location.assign(window.location.hash.slice(1));`,
          errors: [{ messageId: 'insecureRedirect' }],
        },
        {
          code: `
            const next = location.search;
            location.replace(next);
          `,
          errors: [{ messageId: 'insecureRedirect' }],
        },
        // Attacker controls the LEADING position of the concatenation, so the
        // origin of the target is theirs.
        {
          code: `location.assign(location.hash + '/callback');`,
          errors: [{ messageId: 'insecureRedirect' }],
        },
        // …and of the template.
        {
          code: 'location.assign(`${document.referrer}/next`);',
          errors: [{ messageId: 'insecureRedirect' }],
        },
        // Stripping the leading `#` is not a sanitiser.
        {
          code: `location.assign(decodeURIComponent(location.hash.slice(1)));`,
          errors: [{ messageId: 'insecureRedirect' }],
        },
        // Either arm of a ternary / logical can be the value that lands.
        {
          code: `location.assign(flag ? '/home' : location.href);`,
          errors: [{ messageId: 'insecureRedirect' }],
        },
        {
          code: `location.assign(fallback || document.URL);`,
          errors: [{ messageId: 'insecureRedirect' }],
        },
        // `request` is as much the request object as `req` is.
        {
          code: `res.redirect(request.query.next);`,
          errors: [{ messageId: 'insecureRedirect' }],
        },
        // Computed member read off the request still counts.
        {
          code: `res.redirect(req.query['next']);`,
          errors: [{ messageId: 'insecureRedirect' }],
        },
        // Assignment sink, resolved through scope rather than by scanning
        // backwards through sibling statements.
        {
          code: `
            function go() {
              const target = location.search;
              window.location.href = target;
            }
          `,
          errors: [{ messageId: 'insecureRedirect' }],
        },
      ],
    });
  });

  describe('Resolution edge cases', () => {
    ruleTester.run('binding resolution', noInsecureRedirects, {
      valid: [
        // A re-assigned binding has no single knowable value.
        {
          code: `
            let target = location.hash;
            target = '/safe';
            location.assign(target);
          `,
        },
        // Two declarations of the same name — no single value to resolve to.
        {
          code: `
            var target = location.hash;
            var target = '/safe';
            location.assign(target);
          `,
        },
        // A parameter is not a resolvable initialiser.
        { code: `function go(target) { location.assign(target); }` },
        // A declaration with no initialiser.
        { code: `let target; location.assign(target);` },
        // An import binding.
        { code: `import target from './t'; location.assign(target);` },
        // A free identifier that resolves to nothing at all.
        { code: `location.assign(undeclaredTarget);` },
        // `response.body.data` is not client input — only `req`/`request` is.
        { code: `location.assign(response.body.data);` },
        // Non-`+` binary operators are not concatenation — the result of a
        // comparison is a boolean, not a target.
        { code: `location.assign(location.href === expected);` },
        // Opaque call: a value passed into a function is not the one returned.
        { code: `location.assign(buildUrl(location.hash));` },
        // A preserving-method call still needs a steerable receiver.
        { code: `location.assign(config.base.slice(1));` },
        // A decoder with no argument at all.
        { code: `location.assign(decodeURIComponent());` },
        // Cycle guard: a self-referential binding must terminate, not recurse
        // forever, and it resolves to nothing knowable.
        { code: `const a = a; location.assign(a);` },
        // Mutually referential bindings, same guard.
        { code: `const x = y; const y = x; location.assign(x);` },
        // A template that opens with static text has a fixed origin.
        { code: 'location.assign(`https://fixed.example/${location.hash}`);' },
        // Computed location property — not a known source read.
        { code: `location.assign(window.location[key]);` },
        // A non-Location receiver named neither `location` nor a holder.
        { code: `location.assign(foo.location.href);` },
        // `document.title` is not a URL source.
        { code: `location.assign(document.title);` },
      ],
      invalid: [
        // Cycle guard: `const a = a` must terminate, and the sibling read is
        // still judged on its own merits.
        {
          code: `
            const a = a;
            const b = location.hash;
            location.assign(b);
          `,
          errors: [{ messageId: 'insecureRedirect' }],
        },
        // Self-referential binding alone reports nothing but must not hang.
        {
          code: `location.assign(document.location.pathname);`,
          errors: [{ messageId: 'insecureRedirect' }],
        },
      ],
    });
  });

  describe('Benchmark FP/FN Regression', () => {
    ruleTester.run('benchmark regression', noInsecureRedirects, {
      valid: [
        // safe_redirect_allowlist — redirect guarded by allowlist .includes() check
        {
          code: `
            const ALLOWED_REDIRECTS = ["/dashboard", "/profile", "/settings"];
            const target = req.query.returnTo;
            if (!ALLOWED_REDIRECTS.includes(target)) {
              return res.redirect("/");
            }
            res.redirect(target);
          `,
        },
      ],
      invalid: [
        // vuln_redirect — open redirect via variable assignment from req.query
        {
          code: `
            const returnUrl = req.query.returnTo;
            res.redirect(returnUrl);
          `,
          errors: [{ messageId: 'insecureRedirect' }],
        },
      ],
    });
  });
});

// ── Anchored-regexp guards (utils/regexp-anchoring.ts) ────────────────────
//
// The two CWE-020 corpus fixtures below differ ONLY in the regular expression
// their guard resolves to. `/^https:\/\/example\.com(\/[^\s]*)?$/` pins the
// whole origin; `/https?:\/\/example.com/` matches anywhere and its unescaped
// dot matches any character. A rule that reads the text around the sink cannot
// tell them apart, and reported both.
describe('no-insecure-redirects — anchored guards', () => {
  ruleTester.run('anchored regexp guards', noInsecureRedirects, {
    valid: [
      // benchmarks/corpus/CWE-020/safe/escaped-anchored-hostname.js
      {
        code: `
          const TRUSTED_HOST = /^https:\\/\\/example\\.com(\\/[^\\s]*)?$/;
          function isTrustedRedirect(target) {
            return TRUSTED_HOST.test(target);
          }
          function handleRedirect(req, res) {
            const target = req.query.next;
            res.redirect(isTrustedRedirect(target) ? target : '/');
          }
        `,
      },
      // The guard written inline, via a named binding.
      {
        code: `
          const OK = /^https:\\/\\/a\\.example$/;
          function h(req, res) {
            const t = req.query.next;
            res.redirect(OK.test(t) ? t : '/');
          }
        `,
      },
      // The guard written inline, as a literal.
      {
        code: `
          function h(req, res) {
            const t = req.query.next;
            res.redirect(/^https:\\/\\/a\\.example$/.test(t) ? t : '/');
          }
        `,
      },
      // Predicate held in an arrow with an expression body.
      {
        code: `
          const OK = /^https:\\/\\/a\\.example$/;
          const isOk = (t) => OK.test(t);
          function h(req, res) {
            const t = req.query.next;
            res.redirect(isOk(t) ? t : '/');
          }
        `,
      },
      // Predicate held in a function expression.
      {
        code: `
          const OK = /^https:\\/\\/a\\.example$/;
          const isOk = function (t) { return OK.test(t); };
          function h(req, res) {
            const t = req.query.next;
            res.redirect(isOk(t) ? t : '/');
          }
        `,
      },
      // Same guard as an if-condition rather than a ternary.
      {
        code: `
          const OK = /^https:\\/\\/a\\.example$/;
          function isOk(t) { return OK.test(t); }
          function h(req, res) {
            const t = req.query.next;
            if (isOk(t)) { res.redirect(t); }
          }
        `,
      },
      // Statements other than the return must not confuse the body scan.
      {
        code: `
          const OK = /^https:\\/\\/a\\.example$/;
          function isOk(t) { log(t); if (!t) { deny(); } return OK.test(t); }
          function h(req, res) {
            const t = req.query.next;
            res.redirect(isOk(t) ? t : '/');
          }
        `,
      },
      // A dot inside a character class is already a literal dot.
      {
        code: `
          function h(req, res) {
            const t = req.query.next;
            res.redirect(/^https:\\/\\/[a.]x\\.example$/.test(t) ? t : '/');
          }
        `,
      },
    ],
    invalid: [
      // benchmarks/corpus/CWE-020/vulnerable/incomplete-hostname-regexp.js
      {
        code: `
          const TRUSTED_HOST = /https?:\\/\\/example.com/;
          function isTrustedRedirect(target) {
            return TRUSTED_HOST.test(target);
          }
          function handleRedirect(req, res) {
            const target = req.query.next;
            if (isTrustedRedirect(target)) {
              res.redirect(target);
              return;
            }
            res.redirect('/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // Unanchored at the start.
      {
        code: `
          function h(req, res) {
            const t = req.query.next;
            res.redirect(/https:\\/\\/a\\.example$/.test(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // Unanchored at the end.
      {
        code: `
          function h(req, res) {
            const t = req.query.next;
            res.redirect(/^https:\\/\\/a\\.example/.test(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // A trailing escaped dollar is a literal `$`, not an end anchor.
      {
        code: `
          function h(req, res) {
            const t = req.query.next;
            res.redirect(/^https:\\/\\/a\\.example\\$/.test(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // Unescaped dot matches any character.
      {
        code: `
          function h(req, res) {
            const t = req.query.next;
            res.redirect(/^https:\\/\\/a.example$/.test(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // `.exec` is not `.test`.
      {
        code: `
          const OK = /^https:\\/\\/a\\.example$/;
          function h(req, res) {
            const t = req.query.next;
            res.redirect(OK.exec(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // A computed member read is not provably `.test`.
      {
        code: `
          const OK = /^https:\\/\\/a\\.example$/;
          function h(req, res) {
            const t = req.query.next;
            res.redirect(OK['test'](t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // An unresolvable name proves nothing.
      {
        code: `
          function h(req, res) {
            const t = req.query.next;
            res.redirect(unknownGuard(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // The binding is a string, not a RegExp.
      {
        code: `
          const OK = 'x';
          function h(req, res) {
            const t = req.query.next;
            res.redirect(OK.test(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // Re-assigned, so the binding no longer holds what it was declared with.
      {
        code: `
          let OK = /^https:\\/\\/a\\.example$/;
          OK = /anything/;
          function h(req, res) {
            const t = req.query.next;
            res.redirect(OK.test(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // Built at run time — unknowable.
      {
        code: `
          const OK = buildPattern();
          function h(req, res) {
            const t = req.query.next;
            res.redirect(OK.test(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // The receiver is neither a literal nor a name.
      {
        code: `
          function h(req, res) {
            const t = req.query.next;
            res.redirect(patterns.host.test(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // A string literal receiver has no pattern.
      {
        code: `
          function h(req, res) {
            const t = req.query.next;
            res.redirect('abc'.test(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // The name resolves to something that is not a function.
      {
        code: `
          const isOk = 5;
          function h(req, res) {
            const t = req.query.next;
            res.redirect(isOk(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // Two declarations — no single knowable value.
      {
        code: `
          var isOk = 1;
          var isOk = 2;
          function h(req, res) {
            const t = req.query.next;
            res.redirect(isOk(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // A declaration with no body cannot be inspected.
      {
        code: `
          declare function isOk(t: string): boolean;
          function h(req, res) {
            const t = req.query.next;
            res.redirect(isOk(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // An import is opaque.
      {
        code: `
          import { isOk } from './guards';
          function h(req, res) {
            const t = req.query.next;
            res.redirect(isOk(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // The predicate returns nothing.
      {
        code: `
          function isOk(t) { return; }
          function h(req, res) {
            const t = req.query.next;
            res.redirect(isOk(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // The guard is not a call at all.
      {
        code: `
          function h(req, res, flag) {
            const t = req.query.next;
            res.redirect(flag ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
      // A method call is not a resolvable predicate name.
      {
        code: `
          function h(req, res) {
            const t = req.query.next;
            res.redirect(guards.isOk(t) ? t : '/');
          }
        `,
        errors: [{ messageId: 'insecureRedirect' }],
      },
    ],
  });
});

// ── Adversarial-corpus regression locks ───────────────────────────────────
//
// Every case here FAILS on the pre-corpus rule. They were found by writing a
// second wave of fixtures aimed at breaking a rule that had just scored 100%,
// which took it back to 93.8% and surfaced five defects — four in the
// suppression path, one in the taint path.
const adversarialTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

adversarialTester.run('no-insecure-redirects — adversarial', noInsecureRedirects, {
  valid: [
    // The three guards that PROVE something. All must stay quiet, or the
    // fixes below are just a rule that reports everything.
    `const n = new URLSearchParams(location.search).get('next');
     location.assign(n && n.startsWith('/') && !n.startsWith('//') ? n : '/');`,
    `const n = new URLSearchParams(location.search).get('next');
     const p = new URL(n, location.origin);
     if (p.origin === 'https://app.acme-corp.io') { window.location.href = n; }`,
    `const ALLOWED = new Set(['/a', '/b']);
     const n = new URLSearchParams(location.search).get('next');
     if (ALLOWED.has(n)) { window.location.href = n; }`,
    // An UNREADABLE predicate handed the target still defers — the fix is to
    // stop trusting names, not to stop trusting everything.
    `import { isValidUrl } from './url';
     const n = location.hash; if (isValidUrl(n)) { location.assign(n); }`,
    // A genuinely opaque helper is still opaque.
    `location.assign(sanitizeRedirect(location.search));`,
  ],
  invalid: [
    // A prefix check is not an origin check: `https://app.acme.io.evil.test`.
    {
      code: `const n = location.hash; if (n.startsWith('https://app.acme.io')) { location.assign(n); }`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    // A LOCAL function wearing an allowlisted validator's name, returning its
    // input unchanged. Readable source beats a blessed spelling.
    {
      code: `const isSafeUrl = (u) => u; const n = location.hash; if (isSafeUrl(n)) { location.assign(n); }`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    // Containment is not an origin check either.
    {
      code: `const n = document.referrer; if (n.includes('app.acme.io')) { location.replace(n); }`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    // An unrelated `.includes(` five lines up used to suppress the finding,
    // because the scan compared sibling statements as TEXT.
    {
      code: `const flags = ['beta']; const on = flags.includes('beta'); const n = location.hash; window.location.href = n;`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    // A readable identity helper passes the value straight through.
    {
      code: `function normalize(v) { return v; } const n = new URLSearchParams(location.search).get('next'); location.assign(normalize(n));`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    // FALSE-NEGATIVE DIRECTION: the same defect with every telling identifier
    // renamed. Detection must survive, or the rule is deciding by spelling.
    {
      code: `const b = new URLSearchParams(window.location.search); const q = b.get('r'); window.location.href = q;`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
  ],
});

/**
 * Regression lock — the cycle guard is per-question, not per-walk.
 *
 * `utils/url-taint.ts` answers two questions about the same receiver in a row:
 * "is this a URL container?" and "is this a passthrough of something tainted?".
 * They shared one `seen` set, so the first question left the binding's name in
 * the guard and the second short-circuited to `false`. Both shapes below are
 * SILENT on that version and both are ordinary front-end code.
 */
ruleTester.run('lock: container probe does not poison the binding walk', noInsecureRedirects, {
  valid: [
    // `origin` is the one URL property that carries nothing an attacker chose.
    // A destructure resolves to the WHOLE initialiser, so widening the helper
    // to see containers made this a finding until the resolver refused patterns.
    `const { origin } = new URL(location.href); location.assign(origin + '/done');`,
    `const { host } = new URL(location.href); location.replace(host);`,
  ],
  invalid: [
    {
      code: `const raw = window.location.hash; const trimmed = raw.slice(1); location.replace(trimmed);`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    {
      code: `const raw = new URLSearchParams(location.search).get('next'); const target = raw.trim(); location.replace(target);`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
    {
      code: `const parsed = new URL(location.href); location.assign(parsed.toString());`,
      errors: [{ messageId: 'insecureRedirect' }],
    },
  ],
});
