---
'eslint-plugin-secure-coding': patch
---

fix: log levels, deserialisers and fs reads resolve a subscripted method

`console['log'](…)` writes at the same level, `yaml['load'](req.body.data)`
deserialises the same request body, and `fs['readFileSync'](p)` yields the same
untrusted bytes. `no-log-injection`, `no-unsafe-deserialization` and
`no-weak-password-recovery` compared `property.name` first.

Two more tests had pinned the miss, one of them named after the coverage branch
it existed to execute — "computed callee property (id 9 FALSE)" — asserting
that `yaml['load'](req.body.data)` was safe.
