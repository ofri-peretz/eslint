---
'eslint-plugin-secure-coding': minor
---

fix(secure-coding): no-hardcoded-credentials reports a literal session secret

`session({ secret: 'keyboard cat' })` was silent: the value reads as prose, and this rule decides on the
value's shape. A string literal passed as `secret` to a call resolved (through the scope manager) to
`express-session` or `cookie-session`, as an element of that `secret` array, or in `cookie-session`'s `keys`,
is now reported whatever it looks like. `process.env.X`, config lookups, `process.env.X || 'dev'` defaults,
placeholders and `ignorePatterns` entries stay quiet, as does a local function that is merely named `session`.
Expect new findings wherever a session secret is written in source.
