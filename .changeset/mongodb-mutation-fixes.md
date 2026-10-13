---
'eslint-plugin-mongodb-security': patch
---

fix(mongodb-security): six wrong verdicts in six rules surfaced by Stryker mutation testing

- `require-tls-connection` no longer reports a `mongodb+srv://` connection string (TLS is on by default for `+srv`) or one that sets `tls=true` / `ssl=true`. A `tls=false` / `ssl=false` in the string, or `tls: false` in the options, is still reported.
- `require-auth-mechanism` accepts an `authMechanism=` parameter in a literal connection string as naming the mechanism, as it does the options object.
- `no-unbounded-find` reads a `limit` in Mongoose's options argument, `Model.find(filter, projection, { limit })`, not only in the native driver's second argument.
- `require-schema-validation` checks `new mongoose.Schema({...})`, not only `new Schema({...})`.
- `no-unsafe-query` reports a request object spread into the filter, `find({ ...req.body })`, which is `find(req.body)` with extra keys.
- `no-unsafe-where` reports Mongoose's `Model.$where(js)` and `query.$where(js)`, the method form of the `$where` operator.
