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
      // @found Stryker mutation-survivor triage, 2026-10-19
      {
        name: 'FP: an early return on consent !== true guards what follows',
        code: "function f() { if (hasConsent() !== true) return; analytics.track('signup'); }",
      },
    ],
    invalid: [
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
