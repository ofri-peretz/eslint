---
'eslint-plugin-mongodb-security': patch
---

fix(mongodb-security): a `Schema` imported from another library is not Mongoose's

`new Schema({ id: { type: String } })` opened the plugin's file gate and drew
`require-schema-validation` findings in files whose `Schema` came from
`dynamoose` (or any other non-Mongo package). The gate and the rule now skip a
`Schema` — or a `x.Schema` whose namespace `x` — the file imports from a
non-Mongo package. A `Schema` from a relative module is still treated as
Mongoose's.
