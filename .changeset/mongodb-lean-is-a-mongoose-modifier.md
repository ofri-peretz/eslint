---
'eslint-plugin-mongodb-security': patch
---

`require-lean-queries` no longer asks the native driver for `.lean()`.

```js
const user = await db.collection('users').findOne({ _id: id }); // was reported
```

`.lean()` is a **Mongoose** query modifier. The native driver returns a plain
object already and has no `.lean()` at all, so this was a false positive whose
suggestion produces code that throws at runtime. The receiver analysis could
not make the call on its own — it matches `db` and `collection` precisely
because they *are* Mongo handles; it just could not tell which driver's.

The new `mongo-evidence` probe also widens what counts as a Mongo file. A
module that imports `mongoose-paginate`, `mongoose-delete` or
`passport-local-mongoose` without importing `mongoose` itself is still
unambiguously a Mongoose file: of the twelve corpus files containing
`new Schema(` that the four-package list placed outside Mongo, eleven were
exactly these plugin consumers.
