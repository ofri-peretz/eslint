---
'eslint-plugin-mongodb-security': patch
---

fix(mongodb-security): require-schema-validation reads quoted option keys

`{ name: { type: String, 'required': true } }` was reported as unvalidated, and
`{ name: { 'type': String } }` was not checked at all: only bare identifier keys
were read. Option keys are now read by their static name, as Mongoose reads them,
and a computed `[type]` key is no longer taken for the `type` option.
