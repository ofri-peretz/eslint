---
'eslint-plugin-postgresql-security': patch
---

fix: `this['pool']` and `db['query']` name the same pool and statement

`no-transaction-on-pool` tracked the pool field and the query call by
`property.name` in three places — the `this.pool` read, the `this.pool = new
Pool()` binding, and the `.query('BEGIN')` sink.
