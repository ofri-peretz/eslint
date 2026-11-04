---
'@interlace/eslint-devkit': patch
'eslint-plugin-drizzle-security': patch
'eslint-plugin-prisma-security': patch
'eslint-plugin-sequelize-security': patch
'eslint-plugin-typeorm-security': patch
'eslint-plugin-knex-security': patch
---

fix: false negatives and false positives found by the ORM Quint fidelity models.

- `no-mass-assignment` (all five ORM plugins) and `no-unscoped-mutation` (drizzle, prisma, knex) read a string-subscript method (`repo['save'](req.body)`, `db('users')['del']()`, `prisma.user['deleteMany']()`, `db.insert(t)['values'](…)`) as the same call. Each used to skip it.
- drizzle `no-unscoped-mutation` no longer reports a builder held in a `const` and scoped later (`const q = db.delete(users); return q.where(…)`).
- A receiver annotated `any` / `unknown` (`async (tx: any) => tx.$queryRawUnsafe(…)`, `declare const prisma: any`) is judged like an unannotated one instead of as another library's object.
- sequelize `no-unsafe-query` checks the named `literal` import (`import { literal } from 'sequelize'`).
- typeorm `no-unsafe-query` reports request data returned whole from `Raw(() => req.query.filter)`; typeorm `no-mass-assignment` covers the QueryBuilder's `insert().values(…)` / `update().set(…)`.
- `require-tls` (sequelize, typeorm, knex) reports `sslmode=no-verify` in a connection URL as disabled certificate validation, follows a URL bound to a `const` before it reaches the driver, and no longer reports another library's URL (`new Pool({ connectionString })`) in a driver file.
- sequelize `require-tls` and `no-hardcoded-credentials` recognise a sequelize-cli config that gives the connection as `url`.
