---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): mutation survivors triaged across all 35 rules, and the wrong verdicts they hid fixed

Every surviving Stryker mutant was either killed by a new test or proven equivalent. Where a survivor exposed a wrong verdict, the rule is fixed, each with a test that fails first:

- `no-sql-injection` follows a value through any number of aliases (the walk stopped after five), through builders that call other builders or return another builder's call, through pass-through helpers, spread arguments and defaulted parameters. It also recognises a statement that opens with `WITH` or a comment, and a one-branch default no longer clears a parameter.
- `detect-non-literal-regexp` treats a request-chosen key into a constant table, arithmetic over constants and a fully assigned `let` as closed sets, and reports an escape class that does not cover every metacharacter, or misses the `g` flag.
- `no-xpath-injection`, `no-ldap-injection`, `no-unsafe-deserialization`, `no-log-injection`, `no-unchecked-loop-condition` and `no-unlimited-resource-allocation` follow a value through casts, ternaries, destructured parameters, spread arguments and later assignments. `no-ldap-injection` accepts RFC 4526's absolute-false filter.
- `no-pii-in-logs`, `no-insecure-comparison`, `no-privilege-escalation` and `no-sensitive-data-exposure` read quoted, computed and private (`#role`) keys and destructuring defaults, and see a value through unary and arithmetic operators. `no-sensitive-data-exposure` covers every built-in Error constructor.
- `no-missing-authentication` accepts a named handler or a bound `passport.authenticate()` inside an auth wrapper, and reads template and regex mount paths.
- `no-graphql-injection`, `no-improper-sanitization` (`outerHTML`), `no-directive-injection` (Vue 3 `app.directive`), `no-disabled-template-escaping` (`&&=`, `??=`), `no-homoglyph-identifiers` (regex literals), `no-unsafe-regex-construction`, `no-weak-password-recovery` and `require-secure-defaults` follow their documented contracts.
