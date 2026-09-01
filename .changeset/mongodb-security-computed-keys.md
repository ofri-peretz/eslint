---
'eslint-plugin-mongodb-security': minor
---

Sees `o['k']` as the same access as `o.k`

`no-unbounded-find` and friends — `db['collection']('users')`, `q['lean']()` reaches the same property the dotted spelling does, and the rule went
silent on it. That is the notation bundlers emit, so the rule was off on built
output.

A dynamic `o[m]` still names nothing and is still ignored.
