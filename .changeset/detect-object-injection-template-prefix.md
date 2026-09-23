---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): `detect-object-injection` no longer reports a template-literal key with a fixed prefix or suffix

``obj[`no-${x}`]`` always starts with `no-`, so it can never be `__proto__`, `prototype` or
`constructor`. The rule already accepted `obj['no-' + x]` for exactly that reason, but not the same
key written as a template. A literal held in a never-reassigned binding (`const NO = 'no-'`) now
counts as a literal too. Prefixes that a dangerous name could begin with (`` `__pro${x}` ``) still
report.
