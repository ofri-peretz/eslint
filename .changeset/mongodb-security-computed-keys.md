---
'eslint-plugin-mongodb-security': minor
---

fix: `db['collection'](…)` is the same query builder as `db.collection(…)`

`no-unbounded-find` and friends — `db['collection']('users')` and `q['lean']()` reach the same properties the dotted spelling does, and the rule went
silent on it. That is the notation bundlers emit, so the rule was off on built
output.

A dynamic `o[m]` still names nothing and is still ignored.
