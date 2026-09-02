---
'eslint-plugin-mongodb-security': patch
---

fix: `Model['find']({…})` is the same unlean read

`require-lean-queries` matched the read method on `property.name`, so a
subscripted find/findOne still hydrated full documents unreported.
