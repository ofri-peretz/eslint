---
'eslint-plugin-secure-coding': patch
---

perf: `detect-object-injection` resolves the holder through the scope index

`findInitializer` — added in #997 for the null-prototype holder-property exemption —
rescanned every statement of the enclosing blocks on each holder-property access, so N
accesses in one scope cost O(N·S). That is the shape `utils/resolve-reference` exists to
kill, and the other eight lookups in this rule already go through it.

Measured on a worst case where the padding is declared before the holder, so the block
walk cannot short-circuit on the first match: n=400 23.4ms → 18.0ms, n=800 72.0ms →
56.9ms. Behaviour is unchanged.
