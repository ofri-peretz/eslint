// secure-coding/no-weak-password-recovery — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by secure-coding/no-weak-password-recovery
const passwordResetToken = String(Math.random()).slice(2);
