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
        { code: 'res.redirect("/dashboard");' },
        { code: 'res.redirect("../home");' },
        // Test files (if ignoreInTests is true)
        {
          code: 'res.redirect(req.query.url);',
          filename: 'test.spec.ts',
          options: [{ ignoreInTests: true }],
        },
        // Validated with validateUrl
        {
          code: `
            const url = req.query.url;
            validateUrl(url);
            res.redirect(url);
          `,
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
        // Validated with startsWith check
        {
          code: `
            const url = req.params.url;
            url.startsWith('https://');
            res.redirect(url);
          `,
        },
      ],
      invalid: [],
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
