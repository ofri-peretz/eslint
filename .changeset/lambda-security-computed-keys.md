---
'eslint-plugin-lambda-security': patch
---

fix: `exports['handler']` is the same handler as `exports.handler`

Gates across this plugin compared `property.name` before asking what the
property was, so `o['k']` — the notation minifiers and generated clients
emit — did not reach them. They now resolve through the devkit's
`propertyName` / `objectKeyName`.

`exports['handler'] = fn` IS the exports.handler convention; it was pinned as
valid because the key was computed, so an unvalidated `event.body` read inside
it went unreported.
