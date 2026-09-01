// browser-security/no-unencrypted-transmission — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by browser-security/no-unencrypted-transmission
/* eslint browser-security/no-unencrypted-transmission: ["error", {"insecureProtocols":["http://"]}] */
const ok = 'http://legacy.example.com'.startsWith(prefix);
