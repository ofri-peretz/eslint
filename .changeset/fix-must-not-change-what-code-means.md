---
'eslint-plugin-conventions': patch
---

fix: `consistent-existence-index-check` no longer autofixes across the prototype boundary

`in` walks the prototype chain; `hasOwnProperty`, `Object.prototype.hasOwnProperty.call` and `Object.hasOwn` do not. The fixer rewrote freely between them, so `--fix` under the default `preferred: 'in'` turned an own-property check into one that answers `true` for an inherited key — the exact rewrite a parser checking a user-supplied object exists to prevent.

The preference is still reported: which form a codebase writes is the user's style to pick. Only the fixer stops, and only at that boundary — the three own-property forms are interchangeable with each other and still autofix between themselves.

Four existing cases asserted the cross-boundary output as correct. They now assert the report with the source unchanged.
