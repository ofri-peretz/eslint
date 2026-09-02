---
'eslint-plugin-reliability': patch
---

fix: a subscripted `.then` chain is recognised, and stops double-reporting

`no-unhandled-promise` recognised `x["then"]` in one spot and not the other
two, so `Promise['all']([…])` and a subscripted `.catch` still read as
unhandled.

With the chain recognised the rule also stops DOUBLE-reporting: a call inside
a `p['then'](…)` callback is now correctly a promise callback, so only the
outer chain — which still has no `.catch` — reports.
