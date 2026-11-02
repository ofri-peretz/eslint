---
'eslint-plugin-secure-coding': minor
---

feat(secure-coding): every rule is checked against a Quint model of its documented contract

A Quint model of each rule's documented contract is now linted against the rule on every input it can produce (`npm run fidelity`), and Stryker mutation testing covers every rule. The disagreements they found are fixed, each with a test that fails first:

- `no-sql-injection` no longer crashes on a `declare function` escaper.
- `no-template-injection` resolves the engine import, so `_.template(...)` and a destructured handlebars `compile` are reported.
- `no-hardcoded-credentials` reports a structural secret (`sk_live_…`, `AKIA…`, a connection string) whatever the variable is called.
- `no-pii-in-logs` covers logger receivers, `JSON.stringify` of a person record and literal PII, with new `loggers` / `additionalLoggers` / `piiRecords` / `additionalPiiRecords` options.
- `no-unlimited-resource-allocation`, `no-unchecked-loop-condition`, `no-weak-password-recovery`, `no-xpath-injection`, `no-directive-injection` (`outerHTML`) and `no-unsafe-deserialization` follow their documented contracts.
- `detect-object-injection`'s description now says what it checks: a key written as an assignment target, or read and then invoked.
