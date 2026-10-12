---
'eslint-plugin-postgresql-security': patch
---

fix(postgresql-security): resolve string-subscript spellings of sinks and pg types

`no-unsafe-query` matched its sinks only by a dotted property, so `sql['unsafe'](…)` and ``db[`query`](…)`` went silent. It now matches every spelling of the sink name. `no-missing-client-release`, `no-transaction-on-pool` and `no-insecure-ssl` read pg's `Pool` and config types written as `pg['Pool']` / ``pg[`Pool`]`` (indexed access) as well as `pg.Pool`, `Pool` and the pg-pool default export.
