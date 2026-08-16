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

ruleTester.run('require-url-validation', requireUrlValidation, {
  valid: [
    // Safe static URLs written inline.
    { code: "window.location = 'https://example.com'" },
    { code: "location.href = 'https://safe.com'" },
    { code: "window.open('https://example.com')" },

    // A hardcoded URL held in a binding. The OLD rule reported all three of
    // these because the right-hand side was an Identifier — the spelling was
    // the whole verdict. Nothing here is attacker-controlled.
    {
      code: "const SUPPORT_URL = 'https://help.example.com'; window.location = SUPPORT_URL;",
    },
    {
      code: "const CHECKOUT = 'https://shop.example.com/checkout'; location.href = CHECKOUT;",
    },
    { code: 'const target = buildUrl(); window.open(target);' },

    // The origin is fixed by the leading operand, so nothing appended after it
    // can retarget the navigation.
    { code: "location.href = 'https://example.com/go?next=' + location.search" },
    { code: 'window.location = `https://example.com/${location.hash}`' },

    // `location.origin` is the CURRENT origin — echoing it back cannot send a
    // user anywhere they are not already.
    { code: "window.location = location.origin + '/dashboard'" },

    // A value passed into a function is not the value that comes back out.
    { code: 'window.open(sanitizeRedirect(location.search))' },

    // Sinks owned by no-insecure-redirects — this rule must stay quiet so the
    // two do not double-report the same line.
    { code: 'window.location.href = location.search' },
    { code: 'location.assign(location.hash)' },

    // Non-navigation code.
    { code: "const url = 'https://example.com'" },
    { code: 'const x = 1' },
  ],

  invalid: [
    // The address bar is the source. Each of these lets whoever crafted the
    // inbound URL choose the scheme and host of the next page.
    {
      code: 'window.location = location.search',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'location.href = document.referrer',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'window.open(location.hash)',
      errors: [{ messageId: 'violationDetected' }],
    },

    // Through a binding, and through the transforms that strip the `#`/`?`
    // without constraining the origin.
    {
      code: 'const next = location.hash.slice(1); window.location = next;',
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'const raw = decodeURIComponent(location.search); location.href = raw;',
      errors: [{ messageId: 'violationDetected' }],
    },

    // A template that OPENS with the interpolation does set the origin.
    {
      code: 'window.location = `${document.URL}/next`',
      errors: [{ messageId: 'violationDetected' }],
    },

    // Either arm of the fallback can be the result.
    {
      code: "window.open(location.hash || '/home')",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: 'location.href = params.next ? location.search : location.pathname',
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
