---
'eslint-plugin-reliability': patch
---

fix: `rows['find'](…)` is the same nullable return as `rows.find(…)`

The nullable-return gate compared `property.name`, so a subscripted `find`
or `match` did not register as returning undefined on a miss.
