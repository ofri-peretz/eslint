---
'@interlace/eslint-devkit': minor
'eslint-plugin-knex-security': minor
'eslint-plugin-mysql-security': minor
'eslint-plugin-sequelize-security': minor
'eslint-plugin-typeorm-security': minor
---

Add `no-hardcoded-credentials` (CWE-798) to the knex, mysql, Sequelize and
TypeORM plugins, via a new shared `createHardcodedCredentialsRule` factory.

A password in source is a password in git history, in every fork, and in every
layer of the built image. Deleting the line later changes nothing — a real fix
means rotating the credential *and* rewriting history, so the only cheap moment
is before it lands.

The detection generalizes what `eslint-plugin-postgresql-security` has shipped
for pg, and tightens two false positives in the process:

- A connection URL is a finding only when it embeds a password. The pg version
  reports any `postgres://…` literal, including `postgres://localhost:5432/app`,
  which is safe to commit.
- A credential key is a finding only when its value is a non-empty string
  literal, so `password: ''` (the local trust-auth sentinel) stays silent.

It also refuses to treat the credential as its own evidence: an object must name
somewhere to connect *to* — `host`, `port`, `database`, `connectionString` —
before its `password` counts. Without that, `{ user, password }` makes the login
form of every app with a database a finding.
