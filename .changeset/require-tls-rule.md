---
'@interlace/eslint-devkit': minor
'eslint-plugin-knex-security': minor
'eslint-plugin-mysql-security': minor
'eslint-plugin-sequelize-security': minor
'eslint-plugin-typeorm-security': minor
---

Add `require-tls` (CWE-319) to the Knex, mysql2, Sequelize and TypeORM security plugins.

Reports two distinct failures, because they do not share a remediation:

- **`tlsDisabled`** — the connection is plaintext (`ssl: false`, `?sslmode=disable`).
  Every query, every row and the credentials that open the session cross the
  network in the clear.
- **`certificateValidationDisabled`** — `rejectUnauthorized: false` (or
  `trustServerCertificate: true` on mssql, which inverts the polarity). The
  traffic is encrypted but the server is never authenticated, so the client
  completes a handshake just as willingly with whoever answered in the
  database's place. The fix is to supply the CA, never to switch the check off.

The detection gate is a *database connection config* — driver import plus a
connection-shaped sibling key — which is what keeps the rule out of
`eslint-plugin-node-security`, where a bare `rejectUnauthorized: false` would
also match every https agent and fetch option in the repo, and double-report
this line from two plugins.

A value the rule cannot read statically (`ssl: useTls`) is never reported. That
is a deliberate false negative in exchange for findings that are always real.

Not shipped for `prisma-security` (connection config lives in `schema.prisma`,
not JavaScript), `drizzle-security` (delegates connection setup to the
underlying driver, which its own plugin covers) or `sqlite-security` (a local
file, no network to protect).
