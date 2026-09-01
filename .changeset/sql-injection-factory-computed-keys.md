---
'@interlace/eslint-devkit': minor
'eslint-plugin-sqlite-security': patch
'eslint-plugin-mysql-security': patch
'eslint-plugin-prisma-security': patch
'eslint-plugin-drizzle-security': patch
'eslint-plugin-knex-security': patch
'eslint-plugin-typeorm-security': patch
'eslint-plugin-sequelize-security': patch
---

fix: `db['query'](…)` is the same injection sink as `db.query(…)`

`createSqlInjectionRule` builds the `no-unsafe-query` rule for all seven SQL
driver plugins, and it read the sink's name off `callee.property.name`. One
bracket — `conn['query']`, `sql['raw']`, `prisma['$queryRawUnsafe']`,
`knex['raw']`, `db['prepare']` — and the interpolated query passed unreported.

This was a *documented* limitation: a test pinned it as valid ("known
limitation… a false negative") and fourteen rule docs told readers it was one.
The test now asserts the report and all fourteen docs are corrected. A method
chosen at runtime, `db[verb](…)`, genuinely names no sink and remains the
stated limitation.
