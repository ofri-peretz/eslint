// node-security/no-insecure-rsa-padding — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by node-security/no-insecure-rsa-padding
/* eslint node-security/no-insecure-rsa-padding: ["error", {"allowInTests":true}] */
crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, buf);
