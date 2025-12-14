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
    // Non-tracking calls
    { code: "const x = 1" },
    { code: "console.log('test')" },
  ],

  invalid: [
    // Unconditional analytics.track
    { code: "analytics.track('page_view')", errors: [{ messageId: 'violationDetected' }] },
    { code: "analytics.identify(user)", errors: [{ messageId: 'violationDetected' }] },
    { code: "analytics.page('/home')", errors: [{ messageId: 'violationDetected' }] },
    // Unconditional gtag
    { code: "gtag('event', 'purchase')", errors: [{ messageId: 'violationDetected' }] },
  ],
});
