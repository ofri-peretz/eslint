---
"eslint-plugin-browser-security": patch
"eslint-plugin-conventions": patch
"eslint-plugin-drizzle-security": patch
"eslint-plugin-express-security": patch
"eslint-plugin-import-next": patch
"eslint-plugin-jwt": patch
"eslint-plugin-knex-security": patch
"eslint-plugin-lambda-security": patch
"eslint-plugin-maintainability": patch
"eslint-plugin-modernization": patch
"eslint-plugin-modularity": patch
"eslint-plugin-mongodb-security": patch
"eslint-plugin-mysql-security": patch
"eslint-plugin-nestjs-security": patch
"eslint-plugin-node-security": patch
"eslint-plugin-operability": patch
"eslint-plugin-pg": patch
"eslint-plugin-prisma-security": patch
"eslint-plugin-react-a11y": patch
"eslint-plugin-react-features": patch
"eslint-plugin-reliability": patch
"eslint-plugin-secure-coding": patch
"eslint-plugin-sequelize-security": patch
"eslint-plugin-sqlite-security": patch
"eslint-plugin-typeorm-security": patch
"eslint-plugin-vercel-ai-security": patch
---

Add the ecosystem and oxlint marks to the README logo row. Each plugin now
leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
without an ecosystem mark. README-only change - no rule behaviour is affected.
The patch bump is what carries the new README onto npm, which only refreshes a
package README on publish.
