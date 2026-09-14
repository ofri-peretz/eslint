---
'eslint-plugin-react-features': patch
---

fix: `require-render-return` now requires every path through an `if` to return, rather than any path. A `render()` whose only `return` sits in an `if` with no `else` falls through and renders nothing — the shape the rule's own docs print under "❌ Incorrect" — and was silently accepted. `if`/`else` where both branches return, and a trailing return after the `if`, remain valid.
