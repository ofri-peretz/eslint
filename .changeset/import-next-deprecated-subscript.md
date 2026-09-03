---
'eslint-plugin-import-next': patch
---

fix: `obj['deprecatedProp']` reads the same deprecated export

`no-deprecated` resolved member reads on `property.name`, so the subscripted
spelling of a deprecated export was not reported.
