// import-next/no-webpack-loader-syntax — true negative
// @origin       rule-tests
// @caution      Derived from this rule's OWN RuleTester cases, so it cannot
//               measure this rule's precision — it passes by construction.
//               Its value is cross-rule: no OTHER rule may fire on it.
// This MUST NOT be flagged by import-next/no-webpack-loader-syntax
const foo = require('./foo');
