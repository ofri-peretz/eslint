---
'eslint-plugin-maintainability': patch
---

fix: `Promise['all']` and `p['then']` are the same promise API

`no-unhandled-promise` already resolved `x["then"]` in one place and not in
the others, so `Promise['all']([...])` and a `.catch` reached through a
subscript still read as unhandled.
