---
'eslint-plugin-secure-coding': patch
---

fix: XPath, password-length, fail-open and regex gates read a subscripted member

`doc['evaluate'](q)` runs the same query, `password['length'] < 6` is the same
weak check, `okta['verifyAccessToken'](t)` inside a catch-returns-granted still
fails open, and `res['text']()` is the same untrusted read.

`RegExp['escape'](s)` is a SUPPRESSION path — missing it meant reporting a
pattern that had already been escaped.
