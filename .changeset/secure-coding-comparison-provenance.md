---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): no-insecure-comparison checks value provenance before exempting a re-encoding or store re-read

An original written through an alias, a buffer changed later in a loop body, a store swapped through a
property between two reads, and a guard whose condition is reassigned after the choice no longer earn
the exemption.
