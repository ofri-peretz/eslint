---
'eslint-plugin-modernization': patch
---

fix: `prefer-template-literal` no longer destroys a parenthesised addition while rewriting a concat chain. `+` is left-associative, so a nested `+` on the left is the same chain and flattens, but one on the right is its own expression — `"row " + (i + 1)` was rewritten to `` `row ${i}${1}` ``, printing "row 01" where the source printed "row 1", and `"sum: " + (a + b)` lost the sum entirely. Arithmetic that is not itself string-producing now reaches the template as a single placeholder.
