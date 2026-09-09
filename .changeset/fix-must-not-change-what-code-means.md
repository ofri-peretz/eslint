---
'eslint-plugin-conventions': patch
---

fix: `consistent-existence-index-check` no longer autofixes between checks that are not equivalent

Two boundaries the fixer used to cross, either of which changes what the code does.

**The prototype chain.** `in` walks it and the own-property checks do not, so under the default `preferred: 'in'` a `--fix` turned an own-property check into one that answers `true` for an inherited key — the exact rewrite a parser reading a user-supplied object exists to prevent.

**The dispatch.** `obj.hasOwnProperty(k)` looks the method up ON `obj`: it throws on a null-prototype object and calls whatever a shadowing own property points at. Rewriting `Object.hasOwn(Object.create(null), k)` into `Object.create(null).hasOwnProperty(k)` turns a working check into a TypeError.

One conversion survives both and stays fixable: `Object.prototype.hasOwnProperty.call(obj, k)` and `Object.hasOwn(obj, k)` ask the same question through the same dispatch.

The preference is still reported in every case — which form a codebase writes is the user's style to pick. Only the fix stops, so `--fix` can no longer change a program's meaning.

Existing cases that asserted the unsafe rewrites as correct output now assert the report with the source unchanged.
