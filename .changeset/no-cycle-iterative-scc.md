---
'@interlace/eslint-devkit': patch
'eslint-plugin-import-next': patch
---

**`no-cycle` no longer crashes on deep import chains.** Tarjan's SCC pass recursed once per graph node, so a chain deeper than the JS call stack threw `RangeError: Maximum call stack size exceeded` — and since the rule defaults to unlimited traversal depth, nothing capped the descent. ESLint exited 2 with no results at all: not a slow lint, no lint. Observed at file 4,974 of a 5,000-node chain on Node 24.

The traversal now runs on an explicit frame stack. Traversal order and every write to the Tarjan state are unchanged, so the components produced are identical; depth is bounded by heap rather than by the call stack. `eslint-plugin-import` has the same defect in its own `lib/scc.js` and still crashes on the same input.

Chains reach these depths through generated API clients, nested barrel files, and long `export … from` ladders — depth accumulates through re-export edges, which is exactly what the rule follows. Reproduce with `node benchmarks/scripts/repro-deep-chain.mjs 6000`.
