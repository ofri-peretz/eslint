---
'eslint-plugin-mongodb-security': minor
'@interlace/eslint-devkit': patch
---

Eliminate the false-positive storm on real MongoDB/Mongoose codebases.

A dry run against mikemajesty/nestjs-microservice-boilerplate-api (393★,
NestJS 11 + Mongoose, 253 files) produced 145 findings under `recommended`,
138 of which were false positives. Method names alone were doing all the work:
`find` is also `Array.prototype.find`, `connect` is also a Redis client and a
TypeORM query runner, and `findOne`/`updateOne` are the vocabulary of every
generic repository wrapper ever written.

| Rule | Before | After |
|---|---|---|
| `no-select-sensitive-fields` | 80 | 0 |
| `no-unbounded-find` | 41 | 8 |
| `no-bypass-middleware` | 11 | 6 |
| `require-auth-mechanism` | 7 | 0 |
| `require-tls-connection` | 2 | 0 |
| **total** | **145** | **18** |

The remaining 18 are all real Mongoose model calls in one repository file.

New shared `utils/receiver.ts` answers, once per file, whether a call's
*receiver* is plausibly MongoDB — a PascalCase model identifier, a
`model`/`collection`/`db` name, a `db.collection(...)` chain, or a value bound
to a `mongodb`/`mongoose` import. Connection rules are stricter still:
`client`/`connection` earn no benefit of the doubt, since they are just as
likely Redis or Postgres.

`no-select-sensitive-fields` additionally requires evidence that a sensitive
field exists before claiming one is exposed — either the query names it
(`.select('password')`, `{ projection: { password: 1 } }`) or a sensitive
field name is visible in the file. The new `requireVisibleSensitiveField`
option (default `true`) restores the old behaviour for codebases whose schemas
live outside the files that query them.

`allowInTests` now recognises `test/`, `tests/`, `__tests__/`, `__mocks__/`,
`e2e/` and `fixtures/` directories, not only a `*.test.ts` suffix — a
testcontainers helper is not a production connection.

Every fix ships a regression fixture taken from the real scan alongside a
true-positive test, so no rule goes inert.
