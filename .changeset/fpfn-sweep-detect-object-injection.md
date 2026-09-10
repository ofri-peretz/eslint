---
'eslint-plugin-secure-coding': patch
---

fix: `detect-object-injection` no longer flags `Object.assign(Object.create(null), source)`

A prototype-less target has no prototype for a merged-in `__proto__` key to reach, so
there is nothing to report — and flagging it was counterproductive, because
`Object.create(null)` is the remedy this rule's own docs prescribe. `isPrototypelessObject`
now recognises the inlined call as well as the `const o = Object.create(null)` form.

A tainted target still reports, and `Object.assign(Object.create(proto), source)` with a
non-null prototype still reports.
