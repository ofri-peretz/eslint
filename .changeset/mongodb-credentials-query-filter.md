---
'eslint-plugin-mongodb-security': patch
---

fix(no-hardcoded-credentials): a `user` / `username` / `auth` literal in a query filter, update document or aggregation stage is no longer reported.

`User.findOne({ username: 'admin' })`, `User.aggregate([{ $match: { username: 'admin' } }])` and `updateOne({ username }, { $set: { username } })` look up or write an account name. They do not authenticate a connection. The decision follows code structure: the object is an argument to a Mongo data operation (`find*`, `update*`, `delete*`, `replaceOne`, `countDocuments`, `distinct`, `exists`, `aggregate`), either inline or through a `const` passed to one. A literal `pass` / `password` is still reported wherever it is written, and connection options (`mongoose.connect`, `new MongoClient`, `auth: { username, password }`) are judged as before.
