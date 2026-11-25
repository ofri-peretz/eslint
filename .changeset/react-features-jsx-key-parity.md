---
'eslint-plugin-react-features': patch
'oxlint-plugin-react-features': patch
---

fix(react-features): jsx-key matches eslint-plugin-react's defaults and reports only returned list items

On ServerKit (`frontend/src`, 804 files) `react/jsx-key` reported 86 hits that eslint-plugin-react 7.37.5 does not (78 index keys, 8 fragments), 0 after this change.

- `warnUnstableKeys` now defaults to `false`. Upstream's `jsx-key` has no index-key check (that is `no-array-index-key`); set `warnUnstableKeys: true` to keep the report.
- A shorthand fragment returned from a `map` / `Array.from` callback is reported only with `checkFragmentShorthand: true` (upstream `jsx-key.js:101`), as the same fragment in an array literal already was.
- An element, fragment or `createElement` call is judged as a list item only when it is the callback's arrow body or a `return` argument (through the branches of `?:` and the right side of `&&` / `||`). One bound to a variable, passed as an argument or nested in another element (`const body = <>...</>; return <li key={i}>{body}</li>`) is no longer reported as a keyless item.
