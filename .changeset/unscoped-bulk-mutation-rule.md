---
'@interlace/eslint-devkit': minor
'eslint-plugin-prisma-security': minor
'eslint-plugin-drizzle-security': minor
'eslint-plugin-knex-security': minor
---

Add `no-unscoped-mutation` (CWE-284) to the Prisma, Drizzle and Knex plugins

Every ORM ships a bulk mutation whose *unscoped* form rewrites or deletes the
whole table. `prisma.user.deleteMany()`, `db.delete(users)`, `knex('users').del()`
— each one type-checks, passes review, and only shows up once it has run against
production data. `eslint-plugin-drizzle`'s entire published surface is this single
check for a single ORM; this generalizes it.

The detection lives in one place, `createUnscopedMutationRule` in
`@interlace/eslint-devkit`, and each plugin instantiates it with its own sinks and
remediation copy — the same shape `createSqlInjectionRule` already uses. Each
plugin declares where its scope lives: an options-object filter for Prisma, a
chained `.where*()` for Drizzle and Knex.

Every instantiation is gated on the driver: the rule is silent in files that
never import it, and silent on receivers that do not read as a driver handle.
Without that gate, `delete` and `update` would match `map.delete(key)` and
`store.update(patch)` — method names alone are not discriminators.

| Plugin | Sinks | Where scope comes from |
| :--- | :--- | :--- |
| `prisma-security` | `deleteMany`, `updateMany` | `{ where }` in the options object |
| `drizzle-security` | `delete`, `update` | a chained `.where()` |
| `knex-security` | `del`, `delete`, `update` | any of the chained `where*` family |

`argumentRole` is the one thing that cannot be inferred from the AST. A lone
identifier argument is the *filter* for Prisma (`deleteMany(opts)`) and the *table*
for Drizzle (`db.delete(users)`); reading it wrong either suppresses the headline
Drizzle finding or invents a false positive on every dynamically built filter.

**Not shipped for Sequelize or TypeORM.** Sequelize gives its instance and static
forms the same names and both accept an options object, so
`user.destroy({ transaction: t })` (one row) and `User.destroy({})` (the whole
table) are the same AST. Two false positives surfaced in its test suite, and the
rule was withdrawn from that package rather than shipped with them — a rule that
fires on correct code is the one users disable. The genuinely detectable case,
`destroy({ truncate: true })`, becomes its own rule. TypeORM's bare-criteria shape
(`repo.delete({ id })`, with no `where` key) is a third detection shape and is
deferred for the same reason.

Scope that cannot be read statically is treated as present, so the rule stays
silent rather than guessing. Ships in `strict` only — promotion to `recommended`
and `flagship` waits on a measured false-positive profile against the benchmark
corpus.
