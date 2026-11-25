---
'eslint-plugin-secure-coding': patch
'oxlint-plugin-secure-coding': patch
---

fix(detect-object-injection): stop reporting four keys it can prove safe

The index of `Object.values(x).forEach((v, i) => …)`, and of the other Object listing statics, is an Array index. A binding destructured from a const list of string tuples (`for (const [a, b] of PAIRS)`) takes only values the file spells out. `delete o[k]` and `o[k]()` over a literal list now take the proof `o[k] = v` already took, and `delete o[k]` on an `Object.create(null)` object is no longer reported. A list that spells `__proto__` or `constructor` still reports.
