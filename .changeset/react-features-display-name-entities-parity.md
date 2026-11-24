---
'eslint-plugin-react-features': patch
---

fix(react-features): `no-unescaped-entities` forbids upstream's default set; `display-name` reports the wrapper call

`no-unescaped-entities` forbids `>`, `"`, `'` and `}` by default, as eslint-plugin-react 7.37.5 does (`'` was not
reported), reports each occurrence on its own, and suggests each upstream alternative.

`display-name` reports a `memo` / `forwardRef` component on the wrapper call (the outermost one of a
`memo(forwardRef(...))` chain), as upstream does, not on the function inside it, and no longer reports the factory
that returns it: `export default (cls) => forwardRef(...)` gave two reports, one on the factory, where upstream gives
one on the `forwardRef` call.

On react-bootstrap's `src` and `test`, diagnostics now match upstream on all 237 files (236 before).
