---
'eslint-plugin-secure-coding': patch
'eslint-plugin-sequelize-security': patch
---

Stop pointing readers at retired package names. `secure-coding`'s "extend your
coverage" block linked `eslint-plugin-jwt` and `sequelize-security`'s prose named
`eslint-plugin-pg` — both deprecated on npm since #414, and following either
installs the frozen pre-rename build rather than the maintained one.
