---
'eslint-plugin-reliability': patch
---

fix: `no-await-in-loop` no longer reports an await in a loop header slot that is evaluated once (`for...of`/`for...in` iterable, `for` init), and no longer reports one await once per enclosing loop. `for (const p of await Promise.all(xs.map(f)))` costs 1x latency, not Nx, and is the `Promise.all` remedy the rule prescribes. Per-iteration header slots — a `for` test/update, a `while`/`do-while` test, a for-of binding default — stay reported, and a once-evaluated head inside an outer loop is attributed to that outer loop.
