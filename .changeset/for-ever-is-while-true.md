---
'eslint-plugin-secure-coding': patch
---

fix: `no-unchecked-loop-condition` exempts `for (;;)` with a break, as it does `while (true)`

`allowWhileTrueWithBreak` is on by default and exempts a `while (true)` whose body breaks. The `for (;;)` branch never consulted it, so the two spellings of one loop got opposite answers — and `for (;;)` is the idiomatic spelling in a scanner or a find-up walk, which is where this showed up.

The new `hasLoopExit` is stricter than the `hasBreakStatement` the `while` branch uses: it does not descend into nested functions, and an unlabelled `break` belonging to an inner loop or `switch` does not count as leaving the outer loop. `return` and `throw` count alongside `break`, because a `for (;;)` that returns a value terminates just as surely. `for (;;) { tick(); }` still reports.
