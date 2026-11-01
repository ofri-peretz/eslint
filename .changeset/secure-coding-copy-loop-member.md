---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): `detect-object-injection` checks `for (k in opts.source)` copy loops

The prototype-pollution copy-loop check armed only when the iterated object was a bare
parameter (`merge(target, source)`). The options-bag shape, `merge(target, { source })` iterated
as `opts.source`, was skipped. A member of a parameter is as caller-supplied as the parameter, so
the loop is now judged by its root object.
