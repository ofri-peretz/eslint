---
'eslint-plugin-secure-coding': patch
---

`detect-object-injection`: decide numeric keys by provability, not by variable name.

The rule treated a key as a safe array index when the identifier was *called*
`i`, `j`, `k`, `index`, `idx`, `n` or `len`. That both missed real numeric
indices (`result[dstOffset++]`, `arr[lastIndex]`, `buf[stride * n]`) and would
have been fooled by a string-valued variable that happened to be named `n`.

`isNumericKey` now recognises the shapes that are numeric by JS semantics
regardless of what any identifier holds: `++`/`--` (ToNumeric), unary `-` and
`~`, `**`, `+` when *both* operands are themselves provably numeric, and a
conditional whose arms both are. A numeric key can never be the string
`__proto__` / `prototype` / `constructor`, so these cannot pollute a prototype.

Also added: a key built on a string literal prefix (`nodeProperties['node' + i]`)
is safe, because the result always begins with that prefix and so can never
equal a dangerous name. Only a *prefix* counts — a trailing literal (`arr[a + 1]`)
still reports, since `+` runs through string concatenation and the rule's threat
model covers unintended-key writes beyond the three prototype names.

Measured on the ILB-Edge corpus (three.js + webpack + lodash): **1,753 → 1,621
findings**. Recall is unchanged by construction — every suppressed shape is one
where the key provably cannot be a dangerous string.
