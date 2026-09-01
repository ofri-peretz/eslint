// browser-security/no-unescaped-url-parameter — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by browser-security/no-unescaped-url-parameter
export function priceUrl(input) { return `https://a.example.com/v1/i?p=${input.toFixed(2)}`; }
