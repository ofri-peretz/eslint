---
'eslint-plugin-reliability': minor
'oxlint-plugin-reliability': minor
---

feat(reliability): new rule no-unbounded-cause-recursion (CWE-674). Reports a function that calls itself on `error.cause`, or maps itself over `error.errors`, with no visited set and no depth bound, so a cyclic cause throws RangeError. Not in `recommended`.
