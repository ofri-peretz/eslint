/**
 * Mutation-survivor kill fixtures (Stryker triage, 2026-10-19).
 *
 * Each case is the input that tells the rule apart from a surviving mutant.
 */
import { RuleTester } from '@typescript-eslint/rule-tester';
import { noTrackingWithoutConsent } from './index';

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run(
  'no-tracking-without-consent (mutation edges)',
  noTrackingWithoutConsent,
  {
    valid: [
      {
        // @found mutation testing
        name: 'FP: a consent read stored in a const guards the call through the binding',
        code: "const allowed = hasConsent && region !== 'EU'; if (allowed) { analytics.track('signup'); }",
      },
      {
        name: 'one consent binding read on both sides of an OR still guards the call',
        code: "const c = hasConsent; if (c || c) { analytics.track('signup'); }",
      },
      {
        name: 'a bitwise AND with true reads the consent flag un-negated',
        code: "if (hasConsent & true) { analytics.track('signup'); }",
      },
      // @found Stryker mutation-survivor triage, 2026-11-02: a recursion
      // budget of 8 gave up on a long `&&` chain and reported the call, though
      // it only runs once `hasConsent` is true. An existing case pinned it.
      {
        name: 'FP: a long && chain that starts with consent still guards the call',
        code: "if (hasConsent && a2 && a3 && a4 && a5 && a6 && a7 && a8 && a9 && a10) { analytics.track('page_view'); }",
      },
      {
        name: 'a numeric coercion of the consent flag reads it un-negated',
        code: "if (+storedConsent) { analytics.track('signup'); }",
      },
      {
        name: 'a consent guard block that throws leaves the function',
        code: "function f() { if (!hasConsent) { throw new Error('no consent'); } analytics.track('signup'); }",
      },
      {
        name: 'a block early exit with a statement before the return',
        code: "function f() { if (!hasConsent()) { log('no'); return; } analytics.track('x'); }",
      },
      {
        name: 'consent compared equal to true guards the call',
        code: "if (hasConsent() === true) { analytics.track('signup'); }",
      },
      {
        name: 'consent compared unequal to false guards the call',
        code: "if (hasConsent() !== false) { analytics.track('signup'); }",
      },
      {
        name: 'a yoda true comparison guards the call',
        code: "if (true == hasConsent()) { analytics.track('signup'); }",
      },
      {
        name: 'an OR of two consent reads still guards the call',
        code: "if (hasConsent || cmpConsentGiven) { analytics.track('signup'); }",
      },
      {
        name: 'a nullish default on the consent flag still reads it',
        code: "if (storedConsent ?? false) { analytics.track('signup'); }",
      },
      // @found Stryker mutation-survivor triage, 2026-10-19
      {
        name: 'FP: an early return on consent !== true guards what follows',
        code: "function f() { if (hasConsent() !== true) return; analytics.track('signup'); }",
      },
    ],
    invalid: [
      {
        name: 'a self-referencing binding terminates and, reading no consent, does not guard the call',
        code: "const ok = ok && isReady; if (ok) { analytics.track('signup'); }",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a binding initialised from non-consent reads does not guard the call',
        code: "const ready = isReady && isMobile; if (ready) { analytics.track('signup'); }",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a reassigned binding has no single value, so its initial consent read does not guard the call',
        code: "let allowed = hasConsent; allowed = true; if (allowed) { analytics.track('signup'); }",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'an AND of two non-consent reads does not guard the call',
        code: "if (isReady && isMobile) { analytics.track('signup'); }",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a comparison of two non-consent values does not guard the call',
        code: "if (plan === tier) { analytics.track('signup'); }",
        errors: [{ messageId: 'violationDetected' }],
      },
      // @found 2026-11-02: an OR is true when EITHER operand is, so
      // `hasConsent || isAdmin` lets every admin be tracked without consent.
      {
        name: 'FN: an OR with a non-consent operand does not guard the call',
        code: "if (hasConsent || isAdmin) { analytics.track('signup'); }",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        // @found mutation testing
        name: 'FN: an early exit on a negated OR with a non-consent operand does not guard',
        code: "function f() { if (!(hasConsent || isAdmin)) return; analytics.track('signup'); }",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a consent check after the && does not guard the left side',
        code: "analytics.track('x') && hasConsent();",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'consent || track runs the call exactly when consent is missing',
        code: "hasConsent() || analytics.track('x');",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'tracking inside the no-consent branch before its own return',
        code: "if (!hasConsent()) { analytics.track('denied'); return; }",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'a no-consent branch that does not exit does not guard',
        code: "function f() { if (!hasConsent()) log('no'); analytics.track('x'); }",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'tracking in the else branch of a consent check',
        code: "if (hasConsent()) { x(); } else { analytics.track('e'); }",
        errors: [{ messageId: 'violationDetected' }],
      },
      {
        name: 'tracking in the alternate of a consent ternary',
        code: "const r = hasConsent() ? x() : analytics.track('e');",
        errors: [{ messageId: 'violationDetected' }],
      },
      // @found Stryker mutation-survivor triage, 2026-10-19
      {
        name: 'FN: tracking inside consent !== true runs without consent',
        code: "if (hasConsent() !== true) { analytics.track('signup'); }",
        errors: [{ messageId: 'violationDetected' }],
      },
      // @found Stryker mutation-survivor triage, 2026-10-19
      {
        name: 'FN: tracking inside consent != true runs without consent',
        code: "if (hasConsent() != true) { analytics.track('signup'); }",
        errors: [{ messageId: 'violationDetected' }],
      },
      // @found Stryker mutation-survivor triage, 2026-10-19
      {
        name: 'FN: tracking inside a yoda false === consent runs without consent',
        code: "if (false === hasConsent()) { analytics.track('signup'); }",
        errors: [{ messageId: 'violationDetected' }],
      },
    ],
  },
);
