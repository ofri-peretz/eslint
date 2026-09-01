// import-next/no-unresolved — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by import-next/no-unresolved
/* eslint import-next/no-unresolved: ["error", {"ignore":["does-not-exist"]}] */
import foo from 'does-not-exist';
