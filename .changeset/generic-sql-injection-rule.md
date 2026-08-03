---
'eslint-plugin-pg': patch
---

Extract the raw-SQL-injection detector (CWE-89) into
`@interlace/eslint-devkit` as `createSqlInjectionRule`, so every driver plugin
can instantiate it with its own sinks and remediation copy.

Background: scanning OWASP Juice Shop with the recommended presets of
`secure-coding`, `node-security`, `express-security` and `mongodb-security`
produced zero findings on its two flagship SQL injections
(`routes/search.ts`, `routes/login.ts` — both `sequelize.query()` template
literals). The detection was never the problem: `pg/no-unsafe-query` matches
any `.query()` member call and flags both correctly. The problem is
distribution — nobody on Sequelize installs the Postgres plugin.

The factory takes the sink list, a SQL-keyword precision gate, and the
remediation copy, which is everything that actually differs between drivers.
`pg/no-unsafe-query` is now an instantiation of it: same rule id, message
ids, sink and behaviour, and all 28 pre-existing rule tests pass untouched.

Also raises the timeout on the `no-deprecated-plugin-references` guard in
devkit. Both layers shell out to a repo-wide `grep`, which cannot finish
inside vitest's 5s default once the suite has enough test files running in
parallel — it failed as a timeout, not a violation.

Driver-scoped plugins that instantiate the factory ship separately.
