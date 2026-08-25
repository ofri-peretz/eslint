---
'eslint-plugin-modernization': patch
---

fix: `prefer-at` no longer suggests `.at()` where the element is being written

`.at()` returns a value, not a reference, so `arr.at(-1) = 5` is a syntax
error — as are the compound assignment, `++`/`--` and `delete` forms. The rule
reported on all of them, which is worse than noise: the fix it suggested did
not compile.

Found by a census of the rule's findings on the pinned corpus. One line in
Shopify's CLI produced two findings —
`durationStack[durationStack.length - 1] = (durationStack[...] ?? 0) + d` — one
for the read and one for the assignment target. The read is correct; the target
never was.

Reads are unaffected.
