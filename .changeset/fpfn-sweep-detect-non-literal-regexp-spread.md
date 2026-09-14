---
'eslint-plugin-secure-coding': patch
---

fix: `detect-non-literal-regexp` resolves a spread of a constant array

The rule accepts "constant-preserving methods over a constant array", so `ARR.join('|')`
is silent — but the array walk bailed on sight of any `SpreadElement`, so `[...ARR].join('|')`
reported. A spread of a constant is no less resolvable than the constant itself.

The spread's argument now has to prove itself like any other element, so the two spellings
of one value agree. `[...rest]` over a parameter still reports, and so does
`[...new Set([…])]` — a Set's contents are reachable through `.add`/`.delete`, which this
file does not model.
