---
'eslint-plugin-maintainability': patch
---

fix(maintainability): `consistent-function-scoping` no longer reports functions already at module scope inside a literal

An arrow or function expression inside a module-level array or object literal — an
`it.each` table, `export const steps = [function first() {}]` — was told to move to
module scope, the scope it was already in. The module-scope guard only stepped over
binding wrappers and stopped at the `ArrayExpression`. It now also steps over array
elements and object property values; a function in a literal inside another function
still reports.
