---
'eslint-plugin-maintainability': patch
---

fix: `consistent-function-scoping` no longer reports a function that captures a sibling function declared in the same scope. Hoisting makes the sibling reachable from the outer scope, so the inner function cannot be moved there without breaking the reference — the rule was recommending a move that does not compile.
