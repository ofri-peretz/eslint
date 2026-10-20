---
'eslint-plugin-postgresql-security': patch
---

fix(postgresql-security): no-hardcoded-credentials skips test files

The file-wide DSN sweep reported every `postgres://user:secret@…` fixture in a
spec — `createPostgresClientConfig('postgres://u:secret@203.0.113.7/db')` in a
vitest file is a test input, not a committed production secret. Test files are
now skipped, the policy every other credentials rule already follows
(BENCHMARK-CRITERIA B1).

fix(postgresql-security): the relative-module gate follows re-exports, not the whole import graph

The gate opens when a relative import leads to a module that imports a
PostgreSQL client. Past the first hop it followed every import, so a TypeORM
`DataSource` module importing a hundred entities — one of which reached `pg` —
made every repository file "use PostgreSQL", and `repo.query('SELECT * …')`
drew `no-select-all`, `no-unsafe-query` and `no-batch-insert-loop` findings on
TypeORM code. Past the first hop only `export … from` re-exports are followed
now, as the gate's documentation always described.

A file that imports another ORM or SQL client itself (TypeORM, Knex, Sequelize,
Prisma, Drizzle, mysql) no longer takes relative evidence: TypeORM's
`queryRunner.release()` and `queryRunner.manager.query()` drew
`prevent-double-release` and `no-floating-query` because an imported service
owned a `pg.Pool`.

`no-hardcoded-credentials` also skips a DSN written as a JSX attribute value —
`<Input placeholder="postgresql://user:password@host:5432/database" />` is UI
text.
