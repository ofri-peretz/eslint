---
'eslint-plugin-drizzle-security': patch
'eslint-plugin-knex-security': patch
'eslint-plugin-mysql-security': patch
'eslint-plugin-prisma-security': patch
'eslint-plugin-sequelize-security': patch
'eslint-plugin-sqlite-security': patch
'eslint-plugin-typeorm-security': patch
---

Refresh the README npm serves for these plugins. npm renders the README from the
last publish, so all seven still advertise `eslint-plugin-pg` and
`eslint-plugin-jwt` — names retired in #414 and since deprecated on npm. A reader
who followed one installed the frozen pre-rename package instead of the
maintained one. The repo has been correct since the rename; only a publish moves
what npmjs.com shows.
