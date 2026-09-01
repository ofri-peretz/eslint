---
'eslint-plugin-postgresql-security': patch
---

fix: a quoted object key resolves like a bare one

Gates across this plugin compared `property.name` before asking what the
property was, so `o['k']` — the notation minifiers and generated clients
emit — did not reach them. They now resolve through the devkit's
`propertyName` / `objectKeyName`.
