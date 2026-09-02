---
'eslint-plugin-secure-coding': patch
---

fix: sixteen rules read a member spelled with a string subscript

`Object['assign'](target, source)` performs the same uncontrolled merge as
`Object.assign`, `list["length"]` is the language's `.length`, and
`obj['hasOwnProperty'](k)` is the same guard. Sixteen rules compared
`property.name` before asking what the property was.

`no-electron-security-issues` carried its own local `propertyName` that
refused any computed key, so `{ ['nodeIntegration']: true }` in a
`webPreferences` block was invisible too. It now uses the devkit's
`objectKeyName`, which resolves the quoted form.

Three tests had pinned the miss, one of them a false positive:
`list["length"] == 3` was reported as a loose-equality type check while the
dotted `list.length == 3` was exempt.
