---
'eslint-plugin-secure-coding': patch
---

fix: `db['query'](sql)` is the same SQL sink as `db.query(sql)`

`no-sql-injection` resolved the method name in two branches — a non-computed
Identifier, then a string-literal subscript — where `propertyName` answers
both. Resolving a key through a BINDING (`db[QUERY]` where `const QUERY =
'query'`) is what the function is really for, and that arm stays.
