// node-security/no-static-iv — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by node-security/no-static-iv
crypto.createCipheriv("aes-256-gcm", key, Buffer.from([18, 52, 86, 120]));
