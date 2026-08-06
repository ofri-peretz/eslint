---
'@interlace/eslint-devkit': patch
'eslint-plugin-browser-security': patch
'eslint-plugin-conventions': patch
'eslint-plugin-drizzle-security': patch
'eslint-plugin-express-security': patch
'eslint-plugin-import-next': patch
'eslint-plugin-jwt': patch
'eslint-plugin-jwt-security': patch
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
'eslint-plugin-postgresql-security': patch
'eslint-plugin-prisma-security': patch
'eslint-plugin-react-a11y': patch
'eslint-plugin-react-features': patch
'eslint-plugin-reliability': patch
'eslint-plugin-secure-coding': patch
'eslint-plugin-sequelize-security': patch
'eslint-plugin-sqlite-security': patch
'eslint-plugin-typeorm-security': patch
---

Correct the ESLint peer range shown in the README Compatibility table.

The manifest floor moved to 8.40.0, but every package README still advertised
`^8.0.0 || ^9.0.0 || ^10.0.0`. The README is what npm renders on the package
page, so the requirement consumers actually read disagreed with the one npm
enforced: an install on 8.39.x warns about a peer conflict while the README
says that version is supported.

The range was missed by the original sweep because a markdown table escapes
the union as `\|\|`, so a grep for the plain shape matched none of the 29
files.

Also updates `.agent/rules/readme-structure.md` and
`.agent/compatibility-matrix.md`, which template this table for new packages,
and adds a README-vs-manifest assertion to
`scripts/__tests__/eslint-peer-floor.test.ts` so the two cannot drift again.
