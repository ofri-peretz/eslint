/**
 * @fileoverview Tests for no-tracking-without-consent
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noTrackingWithoutConsent } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-tracking-without-consent', noTrackingWithoutConsent, {
  valid: [
    // Tracking inside consent check
    { code: "if (hasConsent) { analytics.track('event') }" },
    { code: "if (userConsent) { gtag('event', 'click') }" },
    { code: "if (consentGiven) { analytics.identify(userId) }" },
    // Consent read off an object, and through a call.
    { code: "if (prefs.consent) { analytics.track('event') }" },
    { code: "if (hasCookieConsent()) { gtag('event', 'click') }" },
    { code: "if (await getConsentState()) { analytics.page('/home') }" },
    // The other three grant shapes.
    { code: "hasConsent && analytics.track('event')" },
    { code: "hasConsent ? analytics.track('event') : null" },
    { code: "if (!hasConsent) { return; } analytics.track('event');" },
    { code: "function boot() { if (!gdprAccepted) throw new Error('no'); gtag('event', 'x'); }" },
    // The refusal branch of an inverted test still grants on the else side.
    { code: "if (!hasConsent) { showBanner(); } else { analytics.track('event'); }" },
    { code: "if (hasConsent === false) { showBanner(); } else { gtag('event', 'x'); }" },
    // Non-tracking calls
    { code: 'const x = 1' },
    { code: "console.log('test')" },
    { code: "analytics.flush()" },
    { code: "if (isMobile) { renderApp(); }" },
    // Consent proven by one operand of a compound test.
    { code: "if (isReady && hasConsent) { analytics.track('event') }" },
    { code: "if (allowed && !gdprBlocked) { analytics.track('event') }" },
    { code: "if (consentLevel === 'full') { analytics.track('event') }" },
  ],

  invalid: [
    // Unconditional analytics.track
    { code: "analytics.track('page_view')", errors: [{ messageId: 'violationDetected' }] },
    { code: 'analytics.identify(user)', errors: [{ messageId: 'violationDetected' }] },
    { code: "analytics.page('/home')", errors: [{ messageId: 'violationDetected' }] },
    // Unconditional gtag
    { code: "gtag('event', 'purchase')", errors: [{ messageId: 'violationDetected' }] },

    // ---- Fixture correction ----------------------------------------------
    // The old rule counted ANY enclosing `if` or ternary as protection without
    // ever reading the test, and the suite pinned `if (hasConsent)` as valid
    // in a way that would have passed on a rule that ignored the test
    // entirely. These are the shapes that exposes.

    // The tracking is in the branch where consent was REFUSED.
    {
      code: "if (!hasConsent) { analytics.track('page_view'); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "if (hasConsent === false) { gtag('event', 'purchase'); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "if (hasConsent) { renderBanner(); } else { analytics.track('page_view'); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "hasConsent ? null : analytics.track('page_view')",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "!hasConsent && analytics.track('page_view')",
      errors: [{ messageId: 'violationDetected' }],
    },

    // The guard is about something else entirely.
    {
      code: "if (isMobile) { analytics.track('page_view'); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "if (user.isAdmin) { gtag('event', 'purchase'); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "isProduction ? analytics.page('/home') : null",
      errors: [{ messageId: 'violationDetected' }],
    },

    // An early return that does not actually exit.
    {
      code: "if (!hasConsent) { logSkip(); } analytics.track('page_view');",
      errors: [{ messageId: 'violationDetected' }],
    },
    // An early return on the GRANTED branch leaves the rest unguarded.
    {
      code: "if (hasConsent) { return; } analytics.track('page_view');",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A non-`if` statement before the call is not a guard.
    {
      code: "const region = 'eu'; analytics.track('page_view');",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A guard that appears AFTER the call cannot have gated it.
    {
      code: "analytics.track('page_view'); if (!hasConsent) { return; }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // `==` reads the same as `===`.
    {
      code: "if (hasConsent == false) { analytics.track('page_view'); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A test with no identifier in it at all.
    {
      code: "if (true) { analytics.track('page_view'); }",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A test nested deeper than the walk goes. The recursion is bounded on
    // purpose, and an expression this deep is not a consent check.
    {
      code: "if (hasConsent && a2 && a3 && a4 && a5 && a6 && a7 && a8 && a9 && a10) { analytics.track('page_view'); }",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

/**
 * `analyticsMethods` REPLACES the sink list. The rule's own docs listed
 * non-standard analytics clients as a known false negative whose only
 * mitigation was manual review; this is that mitigation.
 */
ruleTester.run('option: analyticsMethods', noTrackingWithoutConsent, {
  valid: [
    // `screen` is not a default sink.
    { code: "analytics.screen('Checkout')" },
    // …and `track` stops being one when the list is replaced.
    {
      code: "analytics.track('event')",
      options: [{ analyticsMethods: ['screen'] }],
    },
  ],
  invalid: [
    // Same two snippets, verdicts swapped.
    {
      code: "analytics.screen('Checkout')",
      options: [{ analyticsMethods: ['screen'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "analytics.track('event')",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

/**
 * `consentIdentifiers` REPLACES the vocabulary. The same code must give a
 * different verdict with and without it.
 */
ruleTester.run('option: consentIdentifiers', noTrackingWithoutConsent, {
  valid: [
    {
      code: "if (privacyOk) { analytics.track('event') }",
      options: [{ consentIdentifiers: ['privacyOk'] }],
    },
    // `consent` is in the default vocabulary.
    { code: "if (hasConsent) { analytics.track('event') }" },
  ],
  invalid: [
    // Same two snippets, verdicts swapped.
    {
      code: "if (privacyOk) { analytics.track('event') }",
      errors: [{ messageId: 'violationDetected' }],
    },
    {
      code: "if (hasConsent) { analytics.track('event') }",
      options: [{ consentIdentifiers: ['privacyOk'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
