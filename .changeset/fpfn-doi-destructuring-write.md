---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): `detect-object-injection` now reports a write through a destructuring or loop-head target

`[o[a][b]] = [v]`, `({ x: o[k] } = src)`, `[...o[k]] = xs` and `for (o[k] of xs)`
were classified as reads and exempted, although each performs the same write as
`o[a][b] = v` — and the two-step form pollutes `Object.prototype` (verified in
Node 24). Pattern defaults and computed pattern keys are still treated as reads,
and numeric-index swaps stay silent.
