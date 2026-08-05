---
'eslint-plugin-browser-security': patch
'eslint-plugin-conventions': patch
'eslint-plugin-drizzle-security': patch
'eslint-plugin-express-security': patch
'eslint-plugin-import-next': patch
'eslint-plugin-jwt': patch
'eslint-plugin-knex-security': patch
'eslint-plugin-lambda-security': patch
'eslint-plugin-maintainability': patch
'eslint-plugin-modernization': patch
'eslint-plugin-modularity': patch
'eslint-plugin-mongodb-security': patch
'eslint-plugin-mysql-security': patch
'eslint-plugin-nestjs-security': patch
'eslint-plugin-node-security': patch
'eslint-plugin-operability': patch
'eslint-plugin-pg': patch
'eslint-plugin-prisma-security': patch
'eslint-plugin-react-a11y': patch
'eslint-plugin-react-features': patch
'eslint-plugin-reliability': patch
'eslint-plugin-secure-coding': patch
'eslint-plugin-sequelize-security': patch
'eslint-plugin-sqlite-security': patch
'eslint-plugin-typeorm-security': patch
'eslint-plugin-vercel-ai-security': patch
---

Load rule modules on demand instead of at plugin load.

Every plugin barrel used to `require` all of its rules the moment ESLint loaded
the plugin, whether or not your config enabled them. `plugin.rules[id]` is only
ever read for rules a config turns on, so the rest was parse-and-compile cost
for code that never ran.

The published entry now exposes each rule behind a getter, so a rule module is
read the first time something asks for it. Measured on a 7-plugin config with 34
rules enabled: 163 rule modules loaded and 251 ms of plugin load, against 34
modules and 8.5 ms — total ESLint wall time 251 ms → 109 ms. On a preset that
enables most of a plugin (`node-security/recommended`, 25 of 37) it is a wash,
72 ms → 65 ms. It is never slower; the win scales with how many plugins you
stack and how few of their rules you use.

Nothing about the plugin API changes. `Object.keys(plugin.rules)` still lists
every rule without loading any of them, repeated reads return the same object,
and the `./oxlint` sub-export is the same plugin object it always was.

`eslint-plugin-jwt` and `eslint-plugin-vercel-ai-security` also re-export their
rule objects as named top-level exports, which cannot be deferred — those two
keep loading eagerly.
