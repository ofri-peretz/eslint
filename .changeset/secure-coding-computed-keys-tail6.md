---
'eslint-plugin-secure-coding': patch
---

fix: `client['search'](baseDN, filter)` runs the same LDAP query

`no-ldap-injection` matched the query method on `property.name`, so a
subscripted `search`/`bind`/`modify` carried the interpolated filter
unreported.
