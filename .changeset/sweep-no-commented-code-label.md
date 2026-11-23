---
'eslint-plugin-conventions': patch
---

fix(conventions): no-commented-code false positive on a label-like prose prefix

`Word:` followed by a run of bare words and a parenthetical aside (e.g.
`Always: scoped log statement (function-specific log group)`) read as
commented-out code.
