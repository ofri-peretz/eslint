---
'@interlace/eslint-devkit': patch
---

test: pin the shared deciders that resolve `o['k']`

`isModuleBinding`'s member arm and `createSqlInjectionRule`'s callee
resolution both accept a string subscript, and neither was pinned: reverting
each to `property.name` left all 1841 devkit tests and all seven SQL plugins
green. The sql-injection factory's own valid table pointed at an invalid case
that had never been written. Both are now cases that fail on the unfixed
resolver.
