---
'eslint-plugin-node-security': patch
---

fix: `presented['localeCompare'](stored)` is the same non-constant-time compare

`no-timing-unsafe-compare` resolved the comparison method off `property.name`,
so a subscripted `equals`/`startsWith`/`localeCompare` against a stored token
leaked the same timing signal unreported.
