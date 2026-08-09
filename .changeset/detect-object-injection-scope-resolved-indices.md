---
'eslint-plugin-secure-coding': patch
---

`detect-object-injection`: resolve index expressions through scope, and drop the index-name allowlist.

Three changes, all replacing naming heuristics with facts about the code:

**Operands resolved through scope.** `values[valueStart + k]` is ordinary index
arithmetic, but `+` between two identifiers proves nothing on its own. Each
operand is now resolved to its declaration: if every value the variable ever
receives is provably numeric, the sum is numeric. Deliberately conservative — a
parameter, a `for..of` binding, or a single non-numeric assignment anywhere
leaves the variable unproven and the access still reports, so the analysis can
only fail to clear a safe access, never clear an unsafe one.

**A literal on either side of `+` disqualifies the dangerous names.**
`array[offset + 1]` always ends with `1` and `obj['node' + i]` always begins
with `node`; neither can equal `__proto__`, `prototype` or `constructor` — the
rule's own `dangerousProperties`. This is the dominant real form once the
offset is a function parameter, where the declaration proves nothing. Scoped to
`dangerousProperties`, so narrowing that option narrows what disqualifies.

**The index-name allowlist is gone.** Treating a key as safe because it was
*named* `i`, `j`, `k`, `index`, `idx`, `n` or `len` was unsound in both
directions: it silently cleared `function put(o, k) { o[k] = 1 }`, where `k` is
an untrusted parameter that merely looks like a counter — a false negative — and
it missed every real index not on the list (`offset`, `lastIndex`, `stride`).
Scope resolution covers the genuine counters and refuses the parameters.

`Math.floor(...)` and the other `Math` methods are now recognised as numeric,
which is how indices are actually computed (`Math.floor(Math.random() * n)`).

Measured on the ILB-Edge corpus: the index-arithmetic class drops **275 → 55**
(−80%), total Edge findings **2,759 → 2,539**. The new false-negative lock
(`o[k]` on a parameter) reports where the old allowlist stayed silent.
