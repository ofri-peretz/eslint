---
'eslint-plugin-modernization': patch
---

fix(modernization): `prefer-at` no longer autofixes an optional access or a destructuring target.

`a?.[a.length - 1]` was rewritten to `a.at(-1)`, which throws a `TypeError`
where the original yielded `undefined` on a nullish `a`; it is now reported
without a fix. `[...xs[xs.length - 1]] = a`, `[xs[xs.length - 1] = 0] = a` and
`({ k: xs[xs.length - 1] } = o)` were rewritten to invalid assignment targets;
these write positions are no longer reported, like the other write targets.
