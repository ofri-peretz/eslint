// browser-security/no-sensitive-data-in-cache — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by browser-security/no-sensitive-data-in-cache
const cache = await caches.open('v1'); await cache.put('/api/me/ssn', res);
