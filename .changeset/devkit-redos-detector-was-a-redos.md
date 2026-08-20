---
'@interlace/eslint-devkit': patch
---

`looksCatastrophic` no longer backtracks polynomially on its own input.

The helper that decides whether a user-supplied rule option is safe to compile
ran three probes against that same untrusted string. Two of them —
`(pattern)[^()]*[+*}][^()]*` and its alternation twin — are 2nd-degree
polynomial by `recheck`, which is the oracle `no-redos-vulnerable-regex`
consults, and our own rule reported both. A ReDoS detector that is itself a
ReDoS is the fault this code exists to police.

Excluding the delimiter from each leading character class anchors the match on
its first occurrence, which removes the ambiguity. The language is unchanged —
verified differentially over 400,000 inputs with zero disagreements — so no
pattern changes verdict. `recheck` now calls all three probes safe, and the
guarantee is pinned by a test that reads the source, so a probe added later is
checked automatically rather than escaping silently.
