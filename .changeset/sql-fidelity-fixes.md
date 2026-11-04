---
'@interlace/eslint-devkit': patch
'eslint-plugin-mysql-security': patch
'eslint-plugin-sqlite-security': patch
'eslint-plugin-drizzle-security': patch
'eslint-plugin-knex-security': patch
'eslint-plugin-prisma-security': patch
'eslint-plugin-sequelize-security': patch
'eslint-plugin-typeorm-security': patch
'eslint-plugin-secure-coding': patch
---

fix(sql): two driver-tracing fixes found by the Quint fidelity models.

- A handle annotated `: any` or `: unknown` (`const pool: any = mysql.createPool(…)`) is traced through its initialiser again. The annotation used to mark it as another library's object, so `no-unsafe-query` stayed silent on every query it ran.
- A prepared statement's or query builder's method (`db.prepare(sql).all(value)`, `db.insert(t).values(row)`) takes bound values, never SQL text, and is no longer judged: a template handed to it as a value (``.all(`${first} ${last}`)``) was reported as SQL injection.
