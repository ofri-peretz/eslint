---
'eslint-plugin-react-features': patch
---

fix(react-features): `display-name` names and reports `memo` / `forwardRef` as eslint-plugin-react 7.37.5 does

A wrapped anonymous function is reported whether or not the call is bound to a variable, because the binding does not
name the inner function: `const Row = memo(() => <div />)` is `Anonymous` in DevTools (`Table.Row = memo(...)`,
`{ Row: memo(...) }` and a body that renders nothing, `memo(() => null)`, are reported the same way). A named function
expression, or `Row.displayName = …`, still names it. `memo(forwardRef(...))` is one component: React names it from
16.12 (15.7, 0.14.10), so it is reported only below that, read from `settings.react.version`.

This reverses the earlier documented divergence from upstream (15 of its cases); `display_name.qnt` changes with it.
Of eslint-plugin-react's own cases, 14 more of display-name's now agree (199 to 213 of 214).
