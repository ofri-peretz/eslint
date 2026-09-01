// browser-security/no-unescaped-url-parameter — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by browser-security/no-unescaped-url-parameter
const q = new URLSearchParams(location.search).get("q"); const u = `https://a.example.com/v1/s?q=${q}`;
