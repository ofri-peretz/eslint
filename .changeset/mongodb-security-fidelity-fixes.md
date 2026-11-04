---
'eslint-plugin-mongodb-security': patch
---

Fix false negatives and false positives found by the Quint fidelity models:

- `require-auth-mechanism` and `require-tls-connection` judge Mongoose's named connection exports (`import { connect } from 'mongoose'`, `createConnection` renamed or destructured from `require`). A bare call has no receiver, so they were skipped.
- `no-debug-mode-production` reports Mongoose's named `set` export (`import { set } from 'mongoose'; set('debug', true)`).
- `no-unsafe-populate` reports a request-controlled `select` in a populate options object and a request-controlled nested `populate`, at any depth and inside arrays. Only `path` was read.
- `require-projection` no longer counts an explicit `null` / `undefined` in the projection slot (`find(filter, null, { sort })`) as a projection.
- `no-select-sensitive-fields` reads Mongoose's projection argument (`findById(id, 'name email')`, `findById(id, { password: 0 })`) and `.select({ ... })` objects, and matches select strings by whole field name. An exclusion projection was reported as exposing the field it excludes, and `select('passwordUpdatedAt')` matched `password`.
- `require-schema-validation` follows a renamed `Schema` import (`import { Schema as MongooseSchema } from 'mongoose'`).

Docs: `no-hardcoded-credentials` no longer claims to report `authSource` (it names a database, not a secret); the `no-unsafe-populate` false-negative example is a spread, which is what is not detected; the shorthand-field and wrong-slot-limit limits of `require-schema-validation` and `no-unbounded-find` are documented.
