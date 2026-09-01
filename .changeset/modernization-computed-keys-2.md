---
'eslint-plugin-modernization': patch
---

fix: modernization gates read a subscripted member

Gates compared `property.name` before asking what the property was, so
`o['k']` — the notation minifiers emit — did not reach them.
