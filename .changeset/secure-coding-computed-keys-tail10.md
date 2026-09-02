---
'eslint-plugin-secure-coding': patch
---

fix: three blind spots that lived in a selector, a regex and a substring list

`doc['evaluate'](q)` never set the module's "this file evaluates XPath" flag,
because the visitor selector read `MemberExpression[computed=false] >
Identifier.property`. `password['trim']().length < 6` lost its receiver.
`Date['now']() + salt` matched neither of the literal substrings
`'Date.now()'` / `'Math.random()'` — that arm now reuses the rule's own
`usesPredictableSource`, so there is one definition rather than two.
