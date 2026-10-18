---
'eslint-plugin-postgresql-security': patch
---

fix(postgresql-security): leave postgres URLs in TypeORM configs to typeorm-security

`no-hardcoded-credentials` no longer reports a `postgres://user:pass@…` URL inside a TypeORM options object — `new DataSource({ type: 'postgres', url })`, `TypeOrmModule.forRoot({ … })`, an ormconfig export. `typeorm-security/no-hardcoded-credentials` reports the same literal, so a project running both plugins got two CRITICAL findings on one secret. An object counts as TypeORM's when it has a postgres-family `type` and the file imports `typeorm` / `@nestjs/typeorm` or the object carries TypeORM's own keys (`entities`, `synchronize`, …).
