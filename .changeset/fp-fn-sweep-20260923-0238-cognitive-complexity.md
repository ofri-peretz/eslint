---
'eslint-plugin-maintainability': patch
---

fix(maintainability): `cognitive-complexity` charges an `else if` a flat +1 instead of a nesting increment

A nested `else if` was scored `1 + nesting`, the same as a brand-new nested `if`. The docs' Complexity Factors table charges "Conditionals | +1 | `if`, `else if`", and RSPEC-3776, which the docs cite, adds no nesting increment for `else if`. Only the head `if` of a chain now pays for its depth.
