---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): `detect-object-injection` reports a copy loop over a `for...of` element of a caller-supplied collection

`for (const o of objects) for (const [k, v] of Object.entries(o)) out[k] = v` was silent when `objects` is a parameter, while the `objects.forEach((o) => …)` spelling reported `massAssignment`. The loop element is now judged by the collection it iterates.
