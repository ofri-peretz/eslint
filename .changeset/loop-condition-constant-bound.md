---
'eslint-plugin-secure-coding': minor
---

`no-unchecked-loop-condition` no longer reports a loop whose bound is a literal, such as `for (let cp = 0; cp <= 0x10_ff_ff; cp++)`. The author chose that number and no input reaches it, so it is not CWE-400. The literal-bound check (`largeLoopBound`) still exists as an iteration budget, but it is now opt-in: set `maxStaticIterations` to turn it on. Bounds read from user input, and infinite loops with no exit, are reported as before.
