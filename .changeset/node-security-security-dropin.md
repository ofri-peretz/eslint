---
'eslint-plugin-node-security': minor
---

feat(node-security): `reportLiteralComparands` option for `no-timing-unsafe-compare`; a bare `eval()` no longer reports

`no-timing-unsafe-compare` has a new option, `reportLiteralComparands` (boolean,
default `false`). With it on, a secret-named value compared against a string
literal reports in either order, on the name alone: `password === 'mypass'` and
`'mypass' === password`. This matches `eslint-plugin-security`'s
`detect-possible-timing-attacks`. It is off by default because a string comparand
is usually a tag rather than a secret (`revokedToken === 'access'`), so existing
configs report exactly what they did before.

`detect-eval-with-expression` no longer reports `eval()` called with no argument.
There is no string, so nothing can run. `eval(userInput)` still reports.
