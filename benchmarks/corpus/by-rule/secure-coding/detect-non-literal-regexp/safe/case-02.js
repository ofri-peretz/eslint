// secure-coding/detect-non-literal-regexp — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by secure-coding/detect-non-literal-regexp
const built = new RegExp('a+'); export function f() { return new RegExp(built.source, 'g'); }
