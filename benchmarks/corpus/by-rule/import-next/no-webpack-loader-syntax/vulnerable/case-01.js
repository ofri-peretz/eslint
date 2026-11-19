// import-next/no-webpack-loader-syntax — true positive
// @origin       rule-tests
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST be flagged by import-next/no-webpack-loader-syntax
import foo from 'style!css!./foo.css';
