---
'eslint-plugin-mongodb-security': patch
---

fix(mongodb-security): close five false negatives found by the mutation triage

- `no-unsafe-query` and `no-unsafe-regex-query` walk the branches of `$or` / `$and` / `$nor`, so `find({ $or: [{ name: req.body.name }] })` and a `$regex` from request input inside a branch are reported.
- `no-unsafe-regex-query` reports a `RegExp` built from request input used as the filter value, `find({ name: new RegExp(req.query.q) })`, with or without `new`, and `RegExp(req.query.q)` (no `new`) as a `$regex` value.
- `no-bypass-middleware`, `no-unbounded-find`, `no-unsafe-populate`, `no-unsafe-query`, `no-unsafe-regex-query` and `require-projection` read a computed method name, so `User['updateOne'](...)` is the same call as `User.updateOne(...)`, as it already was in the plugin's other ten rules.
- `no-debug-mode-production` reports the options-object form, `mongoose.set({ debug: true })`.
- The plugin's file-level Mongo gate matches a connection string case-insensitively, like `no-hardcoded-connection-string` does, so a file whose only Mongo evidence is `MONGODB://...` is no longer skipped.
