---
'eslint-plugin-secure-coding': patch
---

fix: LDAP escapes and role checks read a subscripted method

`esc['filterValue'](x)` escapes exactly as `esc.filterValue(x)` does — this one
sits in a SUPPRESSION path, so missing it meant reporting code that was
already escaped. `guard['isAdmin'](user)` is the same role check, and
`this['baseDN']` names the same field.
