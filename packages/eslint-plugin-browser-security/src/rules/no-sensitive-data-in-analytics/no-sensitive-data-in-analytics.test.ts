/**
 * @fileoverview Tests for no-sensitive-data-in-analytics
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import { noSensitiveDataInAnalytics } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
});

ruleTester.run('no-sensitive-data-in-analytics', noSensitiveDataInAnalytics, {
  valid: [
    // Non-sensitive analytics
    { code: "analytics.track('page_view', { page: '/home' })" },
    { code: "analytics.track('click', { element: 'button', action: 'submit' })" },
    { code: "gtag('event', 'click', { element: 'button' })" },
    // Non-analytics code
    { code: "const x = 1" },
  ],

  invalid: [
    // Email in analytics
    { code: "analytics.track('signup', { email: user.email })", errors: [{ messageId: 'violationDetected' }] },
    { code: "analytics.track('login', { userEmail: email })", errors: [{ messageId: 'violationDetected' }] },
    // SSN
    { code: "analytics.track('verify', { ssn: userSSN })", errors: [{ messageId: 'violationDetected' }] },
    // Credit card
    { code: "analytics.track('purchase', { creditcard: card })", errors: [{ messageId: 'violationDetected' }] },
    // Password
    { code: "analytics.track('auth', { password: pwd })", errors: [{ messageId: 'violationDetected' }] },
    // Phone
    { code: "analytics.track('contact', { phone: number })", errors: [{ messageId: 'violationDetected' }] },
    // Address
    { code: "analytics.track('order', { address: addr })", errors: [{ messageId: 'violationDetected' }] },
    // Multiple sensitive fields
    { code: "analytics.track('profile', { email: e, phone: p })", errors: [{ messageId: 'violationDetected' }, { messageId: 'violationDetected' }] },
  ],
});

// ── Adversarial-corpus regression locks ───────────────────────────────────
//
// The rule saw ONE method on ONE client and read ONE argument index. Every
// case below FAILS on the pre-corpus version.
ruleTester.run('no-sensitive-data-in-analytics — adversarial', noSensitiveDataInAnalytics, {
  valid: [
    // The substring false positive this rule shipped: phone ⊂ microphone.
    "analytics.track('Device', { microphoneEnabled: true, headphonesConnected: false });",
    // A payload built by a call is opaque — there is nothing to read.
    "const p = buildAnalyticsPayload(user); analytics.track('Signup', p);",
    // A computed key is not knowable from the AST.
    "analytics.track('Profile', { [fieldName]: value });",
    // An audio player with a `track` method is not an analytics client.
    "player.track('intro.mp3', { email: user.email });",
    // The correct remediation.
    "analytics.track('Signup', { userHash: sha256(user.email), plan: 'pro' });",
  ],
  invalid: [
    // `gtag` puts the payload in argument THREE; the old rule read index 1.
    {
      code: "gtag('event', 'purchase', { value: 1, user_email: o.customerEmail });",
      errors: [{ messageId: 'violationDetected' }],
    },
    // GTM puts it in argument ZERO, on a `window.`-prefixed global.
    {
      code: "window.dataLayer.push({ event: 'lead', phone: form.phone });",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Segment's own docs nest traits one level down.
    {
      code: "analytics.identify(user.id, { traits: { plan: 'pro', ssn: user.taxId } });",
      errors: [{ messageId: 'violationDetected' }],
    },
    // A quoted key reaches the vendor identically to a bare one.
    {
      code: "analytics.track('Ticket', { 'user_phone': t.reporterPhone });",
      errors: [{ messageId: 'violationDetected' }],
    },
    // ES6 shorthand — the key is still `email`.
    {
      code: "const { email, plan } = user; analytics.track('Signup', { email, plan });",
      errors: [{ messageId: 'violationDetected' }],
    },
    // Naming the payload does not change what is in it.
    {
      code: "const p = { a: 1, passport: q.docNumber }; mixpanel.track('e7', p);",
      errors: [{ messageId: 'violationDetected' }],
    },
    // FALSE-NEGATIVE DIRECTION: nothing in the event name or the surrounding
    // identifiers says anything. The payload key is the evidence.
    {
      code: "window.analytics.track('e7', { dob: a.birthDate });",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});

// ── Key and sink refusals ─────────────────────────────────────────────────
ruleTester.run('no-sensitive-data-in-analytics — refusals', noSensitiveDataInAnalytics, {
  valid: [
    // A numeric key is not a field name.
    "analytics.track('e', { 1: x });",
    // A spread carries no key of its own.
    "analytics.track('e', { ...rest });",
    // A method shorthand is not a Property with a readable key/value pair we
    // treat as PII.
    "analytics.track('e', { plan() { return 'pro'; } });",
    // A payload nested past the scan budget is refused rather than walked.
    "analytics.track('e', { a: { b: { c: { d: { e: { email: x } } } } } });",
    // The client name is right but the method is not a transmission.
    "analytics.reset({ email: user.email });",
    // A computed method on a real client.
    "analytics['track']('e', { email: user.email });",
    // A qualified client on a global that is not a window alias.
    "vendor.analytics.track('e', { email: user.email });",
    // A bare function that is not gtag.
    "record('event', { email: user.email });",
    // A spread ARGUMENT is not a payload we can read.
    "analytics.track(...args);",
  ],
  invalid: [],
});

/**
 * `sensitiveFields` — the PII vocabulary, exercised in its OVERRIDDEN state.
 *
 * The option shipped with a schema, a default and a doc entry, and no test ever
 * set it: the branch that reads a user's list had never run. Both directions
 * are pinned here, each against a control on identical source, because an
 * option that only ever WIDENS could be a no-op that happens to match the
 * default, and one that only ever narrows could be reading the wrong list.
 *
 * "Whole word" is the contract, not "substring": `loyaltyTier` matches the
 * two-segment entry `'loyalty tier'`, and `cardIndex` still does not match
 * `'credit card'`.
 */
ruleTester.run('no-sensitive-data-in-analytics — sensitiveFields', noSensitiveDataInAnalytics, {
  valid: [
    // CONTROL, and the DEFAULT pin: a loyalty tier is not PII out of the box.
    "mixpanel.track('signup', { loyaltyTier: t });",
    // NARROWING: a consumer who declares only `ssn` sensitive stops getting the
    // built-in `email` finding — proof the list REPLACES rather than extends.
    {
      code: "mixpanel.track('signup', { userEmail: e });",
      options: [{ sensitiveFields: ['ssn'] }],
    },
  ],
  invalid: [
    // WIDENING: a regulated field this product cares about, spelled as two
    // segments, makes the identical first valid case report.
    {
      code: "mixpanel.track('signup', { loyaltyTier: t });",
      options: [{ sensitiveFields: ['loyalty tier'] }],
      errors: [{ messageId: 'violationDetected' }],
    },
    // CONTROL for the narrowing case: identical source, default vocabulary.
    {
      code: "mixpanel.track('signup', { userEmail: e });",
      errors: [{ messageId: 'violationDetected' }],
    },
  ],
});
