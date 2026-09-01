// import-next/enforce-import-order — true negative
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by import-next/enforce-import-order
/* eslint import-next/enforce-import-order: ["error", {"groups":["external"],"alphabetize":{"order":"asc"}}] */
import { a } from 'a';
import { b } from 'b';
