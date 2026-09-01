// import-next/no-named-as-default-member — true positive
// @origin       rule-tests
// @generated    scripts/generate-corpus-fixtures.ts
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by import-next/no-named-as-default-member
import foo, { bar } from './foo';
        const baz = foo.bar; // Accessing 'bar' on default 'foo' when 'bar' is a named export
