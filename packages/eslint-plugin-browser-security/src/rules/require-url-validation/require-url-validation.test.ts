/**
 * @fileoverview Tests for require-url-validation
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireUrlValidation } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

const NEXT_ROUTER = 'import { useRouter } from "next/navigation";\n';

ruleTester.run('require-url-validation', requireUrlValidation, {
  valid: [
    // Safe static URLs written inline.
    { name: 'a literal URL', code: "window.open('https://example.com')" },
    { code: `${NEXT_ROUTER}const router = useRouter(); router.push('/dashboard');` },

    // A hardcoded URL held in a binding. The OLD rule reported this because
    // the argument was an Identifier — the spelling was the whole verdict.
    { code: 'const target = buildUrl(); window.open(target);' },
    {
      code: `${NEXT_ROUTER}const SUPPORT = 'https://help.example.com'; const router = useRouter(); router.push(SUPPORT);`,
    },

    // The origin is fixed by the leading operand, so nothing appended after it
    // can retarget the navigation.
    { code: "window.open('https://example.com/go?next=' + location.search)" },
    { code: 'window.open(`https://example.com/${location.hash}`)' },

    // `location.origin` is the CURRENT origin — echoing it back cannot send a
    // user anywhere they are not already.
    { code: "window.open(location.origin + '/dashboard')" },

    // A value passed into an unknown function is not the value that comes out.
    { code: 'window.open(sanitizeRedirect(location.search))' },

    // ---- Partition: every Location navigation is no-insecure-redirects' ----
    // These must stay quiet here or the same line draws two rule IDs. Locked
    // as a SET in ../no-insecure-redirects/url-navigation-partition.matrix.test.ts.
    { code: 'window.location.href = location.search' },
    { code: 'location.href = location.search' },
    { code: 'window.location = location.search' },
    { code: 'top.location.href = location.hash' },
    { code: 'location.assign(location.hash)' },
    { code: 'location.replace(location.hash)' },

    // ---- `push` / `replace` are Array and String methods -------------------
    // Reporting them on any receiver would make every queue an open redirect.
    // The router has to resolve to a routing package's `useRouter()`.
    { code: 'queue.push(location.hash);' },
    { code: 'segments.push(location.search);' },
    { code: "document.title.replace(location.hash, '');" },
    // A LOCAL function wearing the hook's name is not the hook.
    {
      code: 'function useRouter() { return { push(x) { log(x); } }; } const router = useRouter(); router.push(location.hash);',
    },
    // `useRouter` from a package that is not a router.
    {
      code: 'import { useRouter } from "my-analytics"; const router = useRouter(); router.push(location.hash);',
    },
    // A router handed in as a prop cannot be resolved to an import — a
    // deliberate false negative, documented in the rule header.
    { code: 'function Page({ router }) { router.push(location.hash); }' },

    // Non-navigation code that shares a shape.
    { code: 'foo.open(url);' },
    { code: 'window.close(url);' },
    { code: 'open(url);' },
    { code: 'window.open();' },
    { code: 'window[go](location.hash);' },
    { code: "const url = 'https://example.com'" },
    { code: 'const x = 1' },
  ],

  invalid: [
    // The address bar is the source; `window.open` puts it in a new context.
    {
      name: 'window.open on the URL fragment',
      code: 'window.open(location.hash)',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'window.open(document.referrer)',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Any global that owns an `open`.
    {
      code: 'self.open(location.search)',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Through a binding, and through the transforms that strip the `#`/`?`
    // without constraining the origin.
    {
      code: 'const next = location.hash.slice(1); window.open(next);',
      errors: [{ messageId: 'violationDetected' }],
    },
    // Either arm of the fallback can be the result.
    {
      code: "window.open(location.hash || '/home')",
      errors: [{ messageId: 'violationDetected' }],
    },

    // ---- The query-string reader ------------------------------------------
    // FN lock. `new URLSearchParams(location.search).get('next')` is THE
    // open-redirect source in front-end code and every rule in this group was
    // blind to it, because `isAttackerSteerableUrl` treats a call as opaque.
    {
      code: 'window.open(new URLSearchParams(location.search).get("popup"));',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const p = new URL(window.location.href).searchParams; window.open(p.get("popup"));',
      errors: [{ messageId: 'violationDetected' }],
    },

    // ---- Framework router --------------------------------------------------
    {
      code: `${NEXT_ROUTER}const router = useRouter(); router.push(location.hash);`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: `${NEXT_ROUTER}const router = useRouter(); router?.push(location.hash);`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: `${NEXT_ROUTER}const router = useRouter(); router.replace(document.URL);`,
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'import { useRouter, useSearchParams } from "next/navigation"; const router = useRouter(); const sp = useSearchParams(); router.push(sp.get("next"));',
      errors: [{ messageId: 'violationDetected' }],
    },
    // React Router's tuple form.
    {
      code: 'import { useSearchParams } from "react-router-dom"; const [params] = useSearchParams(); window.open(params.get("next"));',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ── Adversarial-corpus regression locks ───────────────────────────────────
//
// The corpus proved this rule did not know what validation was. Its own
// message says "Validate URLs before using them for navigation", and both
// remediations it asks for — an exact allowlist and a relative-path guard —
// were reported at HIGH severity, because the rule had no guard awareness at
// all. It now shares `isGuardedDestination` with `no-insecure-redirects`.
const NEXT = 'import { useRouter } from "next/navigation";\n';

ruleTester.run('require-url-validation — adversarial', requireUrlValidation, {
  valid: [
    // The remediations. These FAIL on the pre-corpus rule.
    `const ALLOWED = new Set(['/a','/b']);
     const n = new URLSearchParams(location.search).get('next');
     if (ALLOWED.has(n)) { window.open(n); }`,
    `const n = new URLSearchParams(location.search).get('next');
     window.open(n && n.startsWith('/') && !n.startsWith('//') ? n : '/');`,
    `const n = new URLSearchParams(location.search).get('next');
     const p = new URL(n, location.origin);
     if (p.origin === 'https://app.acme-corp.io') { window.open(n); }`,
    // A validator we cannot read still defers.
    `import { toSafeExternalUrl } from './urls';
     window.open(toSafeExternalUrl(location.search));`,
  ],
  invalid: [
    // A prefix check is not an origin check.
    {
      code: `const n = new URLSearchParams(location.search).get('next');
             if (n.startsWith('https://app.acme.io')) { window.open(n); }`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // HALF the relative-path guard: `//evil.test` starts with `/`.
    {
      code: `const n = new URLSearchParams(location.search).get('next');
             if (n.startsWith('/')) { window.open(n); }`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // A LOCAL identity function wearing a validator's name.
    {
      code: `const toSafeExternalUrl = (u) => u;
             window.open(toSafeExternalUrl(new URLSearchParams(location.search).get('next')));`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // A guard about something else entirely authorizes nothing.
    {
      code: `${NEXT}function useGo(flags) { const router = useRouter();
             const n = new URL(window.location.href).searchParams.get('next');
             return () => { if (flags.newNavigation) { router.push(n); } }; }`,
      errors: [{ messageId: 'violationDetected' }],
    },
    // FALSE-NEGATIVE DIRECTION: innocuous identifiers, same defect.
    {
      code: `const c = new URLSearchParams(window.location.search).get('p'); window.open(c, '_blank');`,
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ── calleeParts refusals ──────────────────────────────────────────────────
ruleTester.run('require-url-validation — refusals', requireUrlValidation, {
  valid: [
    // A callee key chosen at RUNTIME names no method to recognise.
    'window[go](location.hash);',
    // A non-identifier property (a private field).
    'class A { #open; go() { this.#open(location.hash); } }',
    // No callee receiver at all.
    'open(location.hash);',
  ],
  invalid: [
    // Both spellings were pinned above as refusals, one of them as "a computed
    // callee key". `window['open']` opens the same window on the same
    // unvalidated hash.
    {
      code: "window['open'](location.hash);",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
