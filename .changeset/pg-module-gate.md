---
'eslint-plugin-postgresql-security': major
---

Every rule now abstains in files that use no PostgreSQL

The plugin had no notion of whether a file used PostgreSQL at all.
`no-missing-client-release` fired on any `.connect()` — mongoose, redis,
socket.io. `no-unsafe-query` fired on any `.query()`. `no-select-all` fired on
`SELECT *` in any string anywhere.

Measured over **108,838 files across 108 repositories**: 1,305 findings, of
which **1,222 (94%) were in files with no PostgreSQL client**. Two rules were
wrong 100% of the time — `no-missing-client-release` (49 findings, 0 in a
PostgreSQL file) and `prevent-double-release`.

All thirteen rules now require local evidence that the file uses PostgreSQL: an
import or `require` of a PostgreSQL client, or a `postgres://` / `postgresql://`
connection string in the file. Nothing is read from `package.json` and nothing
is resolved across files, so there is no project state to go stale.

After the change the same corpus yields 100 findings instead of 1,305.

This is a **major** bump: any rule may now stay silent where it previously
reported. A file that reaches PostgreSQL only through a wrapper module is a
deliberate miss — the trade against reporting on code with no database in it.
