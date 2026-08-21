---
'eslint-plugin-secure-coding': minor
---

`no-redos-vulnerable-regex` can now ask the oracle for the **degree** of
backtracking, not just whether a pattern is vulnerable at all — exposed as
`reportSecondDegreePolynomial`.

It defaults to `true`, so **default behaviour is unchanged**: quadratic
patterns still report. Set it to `false` to suppress degree-2 findings in a
codebase whose patterns provably run over short, sized input.

```
(.*?)=(.*)$     degree 3, over a 4KB cookie header — ~6e10 steps, a hang
^###\s+(.+)$    degree 2, over one markdown heading — arithmetic
```

That difference is real — on the pinned 8-repository corpus, every finding was
oracle-confirmed and none was exponential, three at degree 3 and three at
degree 2 — but degree only *proxies* the question that decides whether anyone
acts: does the caller size the input? Nothing in the AST answers that. Shipping
the suppression as the default dropped a must-detect CWE-1333 pattern
(`/^(a*).*b/`, degree 2), so the quieter bar is opt-in and costs recall by
construction.

The veto-only invariant is unchanged: the oracle may only ever REMOVE a
finding. A null degree — `recheck` absent, timed out, or unparseable — retracts
nothing, so uninstalling the optional peer can still only add findings, never
hide one.
