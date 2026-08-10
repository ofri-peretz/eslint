---
'@interlace/eslint-devkit': minor
'eslint-plugin-typeorm-security': patch
'eslint-plugin-mysql-security': patch
'eslint-plugin-knex-security': patch
'eslint-plugin-drizzle-security': patch
'eslint-plugin-sqlite-security': patch
'eslint-plugin-prisma-security': patch
'eslint-plugin-sequelize-security': patch
---

Each SQL plugin now reports only in files that import its own driver

`createSqlInjectionRule` discriminated on **method name alone**. That is not an
SDK: `.query()` is TypeORM *and* mysql2 *and* pg; `.raw()` is knex *and* drizzle
with byte-identical config; and sqlite claimed `get`, `all`, `run` and `exec`,
which belong to Express routers and `Promise.all` as much as to a database.

Measured over 73,364 files, that produced **1,142 lines where two or more
plugins reported the same CWE** — 616 postgres×typeorm, 503 mysql×typeorm, 503
mysql×postgres, 347 drizzle×knex. One defect, billed up to three times.

The factory now takes a `modules` list and stays silent in files importing none
of them, compared on the package root so `mysql2/promise` and
`@prisma/client/edge` still match. Relative specifiers never count — otherwise
`'./knex'` would satisfy the knex rule in a repo with no knex.

This makes the collision impossible by construction rather than deduplicated
after the fact, and it is local evidence: no project scan, nothing to go stale,
and a file that does not import the driver is one the rule has nothing to say
about.

Every fixture across the seven suites now carries its driver's import, so the
suites still exercise the detection logic instead of passing on the new gate.
