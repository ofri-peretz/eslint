---
'eslint-plugin-secure-coding': patch
---

fix: `Object['keys']` and `graphql['execute']` name the same operations

`detect-object-injection` matched the mass-assignment source on
`property.name`, so `for (const k of Object['keys'](req.body))` was not
recognised as enumerating caller-supplied keys. `no-graphql-injection` missed
both its execute surface and its safe-caller allowlist the same way — the
second of those is a suppression path, so missing it reported queries that
were already safe.
