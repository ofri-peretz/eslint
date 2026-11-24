---
'eslint-plugin-react-features': patch
---

fix(react-features): `display-name` and `no-unescaped-entities` match eslint-plugin-react 7.37.5

`display-name` reports a `memo` / `forwardRef` component on the wrapper call, as upstream does, not on the function
inside it, and no longer reports the factory that returns it (`export default (cls) => forwardRef(...)` gave two
reports, one on the factory; upstream gives one on the `forwardRef` call). A wrapped anonymous function is reported
whether or not the call is bound to a variable, because the binding does not name the inner function: `const Row =
memo(() => <div />)` is `Anonymous` in DevTools. A named function expression, or `Row.displayName = …`, still names it.
`memo(forwardRef(...))` is one component, named from React 16.12 (15.7, 0.14.10) and reported below that, read from
`settings.react.version`.

`no-unescaped-entities` forbids `>`, `"`, `'` and `}` by default, as upstream does (`'` was not reported), reports each
occurrence on its own, and suggests each upstream alternative.

Of eslint-plugin-react's own cases, 18 more now agree (display-name 199 to 213 of 214, no-unescaped-entities 22 to 26
of 26); on react-bootstrap's `src` and `test` the diagnostics now match upstream on all 237 files.
