---
'eslint-plugin-secure-coding': patch
'eslint-plugin-browser-security': patch
'eslint-plugin-mongodb-security': patch
---

fix: sanitiser, logger, postMessage and query gates read a subscripted member

`DOMPurify['sanitize'](html)`, `container['logger'].warn(…)`,
`w['postMessage'](data, '*')` and `User['find']({…})` each reach exactly what
their dotted spellings reach. Six gates across three plugins compared
`property.name` first.

`no-log-injection` also carried two arms for the same question — an Identifier
branch and a `staticString` fallback — where `propertyName` answers both.

A test had pinned `container['logger']` as an unresolvable receiver; it holds
the same logger, and the same unescaped username reaches the same log line.
