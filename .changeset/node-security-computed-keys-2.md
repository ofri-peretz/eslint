---
'eslint-plugin-node-security': patch
---

fix: crypto, temp-storage and zip-slip gates read a subscripted method

`crypto['createHash'](algo)` selects the algorithm at runtime exactly as
`crypto.createHash(algo)` does, `path['join'](os.tmpdir(), …)` builds the same
path, and `zip['extractAllTo'](dest)` extracts to the same destination.

`no-data-in-temp-storage` also carried a hand-rolled workaround that appended
a quoted key to a module binding by hand, compensating for the resolver's
refusal of computed members. The resolver handles it now, so the workaround is
deleted rather than left to drift from what it was compensating for.
