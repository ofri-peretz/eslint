---
'eslint-plugin-secure-coding': minor
---

`no-redos-vulnerable-regex` asks the oracle for the **degree**, not just whether
a pattern is vulnerable at all.

Quadratic backtracking needs long input to hurt. Over a markdown heading or a
cookie name it is arithmetic; over an unbounded request body it is a denial of
service. Reporting both identically is what makes this rule noisy.

Measured on the pinned 8-repository corpus: every surviving finding was
oracle-confirmed and **none was exponential** — three at degree 3, three at
degree 2. Gating degree 2 off by default took the corpus from **7 findings to
5**, and the ratchet budget came down with it.

```
(.*?)=(.*)$     degree 3, over a 4KB cookie header — ~6e10 steps, a hang
^###\s+(.+)$    degree 2, over one markdown heading — arithmetic
```

`reportSecondDegreePolynomial: true` restores quadratic reporting for codebases
whose patterns run over input the caller does not size.

The veto-only invariant is unchanged: the oracle may only ever REMOVE a finding.
A null degree — `recheck` absent, timed out, or unparseable — retracts nothing,
so uninstalling the optional peer can still only add findings, never hide one.
