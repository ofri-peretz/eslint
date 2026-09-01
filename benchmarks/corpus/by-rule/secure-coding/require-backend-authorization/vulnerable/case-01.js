// secure-coding/require-backend-authorization — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by secure-coding/require-backend-authorization
'use client'; export function render(session) { if (session.user.isAdmin) { impersonate(); } }
