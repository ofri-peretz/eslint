// node-security/no-deprecated-cipher-method — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by node-security/no-deprecated-cipher-method
/* eslint node-security/no-deprecated-cipher-method: ["error", {"allowInTests":true}] */
crypto.createCipher("aes192", pw);
