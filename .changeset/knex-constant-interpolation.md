---
'eslint-plugin-knex-security': patch
'oxlint-plugin-knex-security': patch
'@interlace/eslint-devkit': patch
---

fix(knex-security): `no-unsafe-query` accepts members of an enum imported by a relative path, and destructured parameters typed `number`

The shared SQL-injection judge already treated literals, `const` bindings, enum members declared in the file and `as const` objects as fixed text. Two more constants are now proven, which removed 7 of 89 reports on Infisical's backend (the rest are values read back from the database, enums imported through a path alias, and untyped parameters, none of which a file can prove fixed):

- `${TableName.Project}` where `TableName` is an `enum` exported by a module the file imports with a relative path, followed through `export *` barrels. An alias or a package specifier is still never opened, and an enum member whose initialiser is computed at run time is still reported.
- `({ limit }: Opts)` where `Opts` is an `interface`, a `type` or an inline type written in the same file and `limit` is declared `number`, `boolean` or a literal. A `string` property, an untyped pattern and a missing key are still reported.

The value-following walk in `@interlace/eslint-devkit` now resolves an `export enum` across relative imports, which every driver plugin built on `createSqlInjectionRule` inherits.
