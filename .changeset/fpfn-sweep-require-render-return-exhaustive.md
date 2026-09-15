---
'eslint-plugin-react-features': patch
---

fix: `require-render-return` now requires every path through an `if` to return, rather than any path. A `render()` whose only `return` sits in an `if` with no `else` falls through and renders nothing — the shape the rule's own docs print under "❌ Incorrect" — and was silently accepted. `if`/`else` where both branches return, and a trailing return after the `if`, remain valid.

`switch` is now judged the same way. The check asked only whether _any_ clause contained a `return`, so `switch (k) { case 1: return <A/>; }` passed while an unmatched `k` fell straight out and rendered nothing, and a clause ending in `break` did the same. A `switch` now counts as returning only when a `default` exists and every clause ends in a return — its own, or one it falls through into. Empty fallthrough clauses and clauses returning via `if`/`else` remain valid; no clause is required to carry a bare `return` of its own.
