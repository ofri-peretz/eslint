---
'eslint-plugin-secure-coding': patch
---

fix: `value['constructor'].name` is the same brittle type check

`no-improper-type-validation` matched both levels of `data.constructor.name`
on `property.name`, so the subscripted spelling read as something else
entirely. A test had pinned that as intended under "inner is a COMPUTED
member" — it reads exactly what the dotted form reads, and breaks across
realm boundaries identically.
