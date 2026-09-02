---
'eslint-plugin-mongodb-security': patch
---

fix: `collection('u')['findOne']` is the same query as `.findOne`

Gates across this plugin compared `property.name` before asking what the
property was, so `o['k']` — the notation minifiers and generated clients
emit — did not reach them. They now resolve through the devkit's
`propertyName` / `objectKeyName`.

`db.collection('users')['findOne']({})` was listed as a REJECTION of Mongo
evidence. The receiver is already a proven collection handle and `['findOne']`
names `findOne`; it is now accepted, with `[op]` — a method chosen at runtime
— pinned as the refusal.
