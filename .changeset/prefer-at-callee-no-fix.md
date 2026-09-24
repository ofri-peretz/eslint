---
'eslint-plugin-modernization': patch
---

fix(modernization): `prefer-at` no longer autofixes a callee or template tag.

`new ctors[ctors.length - 1]()` was rewritten to `new ctors.at(-1)()`, which
parses as `new (ctors.at)(-1)` and throws "ctors.at is not a constructor".
`obj.fns[obj.fns.length - 1]()` became `obj.fns.at(-1)()`, which calls with
`this` undefined instead of `obj.fns`; a tagged-template tag had the same
problem. These positions are still reported, but without a fix.
