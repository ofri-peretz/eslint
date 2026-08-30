---
'eslint-plugin-react-features': minor
---

fix: `hooks-exhaustive-deps` decides stability by resolving the binding, not by its name

Stability was matched against three name patterns — `/^set[A-Z]/`,
`/dispatch/i`, `/Ref$/` — and that failed in both directions at once.

It **reported real refs** whose names did not fit: `savedCallback`,
`nextJwtToken`, `frame` and `timeout` were all `useRef` bindings required as
dependencies across the pinned corpus, where React's own rule reports none of
them.

Worse, it **silently exempted reactive values** whose names happened to fit. A
genuinely missing dependency named `setUpValue` or `dispatchTime` was dropped
without a word — a stale closure that ships.

Stability is now read from the binding: a `useRef(...)` call, or the second
element of a `useState`/`useReducer` destructuring. Values from module scope or
unresolved identifiers — imports, globals — are not reactive, which matches
React and also fixes a pre-existing false positive on module-scope imports.

Verified against `react-hooks/exhaustive-deps` on nine cases; it now agrees on
all of them.
