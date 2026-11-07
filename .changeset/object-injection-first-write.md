---
'eslint-plugin-secure-coding': patch
---

fix: `detect-object-injection` puts a copy loop's single finding on its first write in source order. It walked the loop body in parser property order, so an `if … else` copy reported its `else` write under ESLint and its `then` write under oxlint.
