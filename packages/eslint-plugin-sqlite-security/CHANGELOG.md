# eslint-plugin-sqlite-security

## 0.1.0

### Minor Changes

Six new driver-scoped SQL-injection plugins (CWE-89), each shipping one rule —
`no-unsafe-query` at `error` in `recommended`:

- **`eslint-plugin-mysql-security`** — mysql2 / mysql. Sinks: `.query()`, `.execute()` (gated on SQL keywords in the static text, since these are common method names outside MySQL). Remediation names MySQL's own safe API.
- **`eslint-plugin-prisma-security`** — @prisma/client. Sinks: `.$queryRawUnsafe()`, `.$executeRawUnsafe()`. Remediation names Prisma's own safe API.
- **`eslint-plugin-drizzle-security`** — drizzle-orm. Sinks: `.raw()`. Remediation names Drizzle's own safe API.
- **`eslint-plugin-knex-security`** — knex. Sinks: `.raw()`. Remediation names Knex's own safe API.
- **`eslint-plugin-sqlite-security`** — better-sqlite3 / sqlite3. Sinks: `.prepare()`, `.exec()`, `.run()`, `.all()`, `.get()` (gated on SQL keywords in the static text, since these are common method names outside SQLite). Remediation names SQLite's own safe API.
- **`eslint-plugin-typeorm-security`** — typeorm. Sinks: `.query()`. Remediation names TypeORM's own safe API.

All six instantiate the shared `createSqlInjectionRule` from
`@interlace/eslint-devkit`, so detection is one implementation and each
plugin differs only in sinks, precision gate and remediation copy. Install the
one matching your stack and you get exactly one finding per line.

None are added to `eslint-config-interlace`'s aggregated presets: sink names
overlap across drivers (`.query()`, `.raw()`), so bundling them would report the
same line more than once.
