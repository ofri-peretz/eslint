---
'eslint-plugin-node-security': patch
---

fix: timing-compare, LDAP-adjacent and command gates read a subscripted member

`crypto['timingSafeEqual']`-adjacent constant lookups, `cp['spawn'](…)` and
`obj['execaCommand'](`git clone ${url}`)` all name what their dotted spellings
name. The deliberate refusal of `o[k]` — an identifier key under brackets is a
VARIABLE, not a property name — is preserved, since `propertyName` returns null
for exactly that.
