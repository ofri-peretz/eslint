---
'eslint-plugin-sequelize-security': minor
---

Initial release: `eslint-plugin-sequelize-security` — SQL injection detection for the
Sequelize ORM.

An ORM is not a defence against SQL injection; it narrows the surface to the
raw escapes, and those are still built by hand. OWASP Juice Shop's two
flagship injections are both `sequelize.query()` template literals
(`routes/search.ts`, `routes/login.ts`), and no recommended preset in this
ecosystem reported either of them — the only implementation of the detection
shipped inside `eslint-plugin-pg`, which no Sequelize user installs. Both
sites are now pinned as test cases.

`sequelize/no-unsafe-query` (CWE-89, `error` in `recommended`) instantiates
the shared `createSqlInjectionRule` from `@interlace/eslint-devkit` with:

- **Sinks:** `sequelize.query()` and `Sequelize.literal()` — the latter is
  where `ORDER BY` / column-name injection lives.
- **Remediation:** Sequelize's own conventions (`replacements`, `bind`),
  not generic "use parameterized queries" advice.
- **Taint tracking:** queries assembled across statements, including `+=`.

Sequelize runs on Postgres, MySQL, MariaDB, SQLite, MSSQL and Snowflake — the
rule fires on the raw-SQL escapes regardless of dialect.
