---
'eslint-plugin-node-security': patch
---

fix: `Object['assign'](process.env, req.body)` is the same env injection

`no-env-injection` matched the merge on `property.name`, so the subscripted
spelling copied every request key into the environment — PATH, NODE_OPTIONS
and LD_PRELOAD included — unreported.
