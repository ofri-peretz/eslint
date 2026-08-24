---
'@interlace/eslint-devkit': patch
'eslint-plugin-conventions': patch
'eslint-plugin-drizzle-security': patch
'eslint-plugin-express-security': patch
'eslint-plugin-import-next': patch
'eslint-plugin-jwt-security': patch
'eslint-plugin-knex-security': patch
'eslint-plugin-lambda-security': patch
'eslint-plugin-maintainability': patch
'eslint-plugin-modernization': patch
'eslint-plugin-modularity': patch
'eslint-plugin-mongodb-security': patch
'eslint-plugin-mysql-security': patch
'eslint-plugin-nestjs-security': patch
'eslint-plugin-operability': patch
'eslint-plugin-postgresql-security': patch
'eslint-plugin-prisma-security': patch
'eslint-plugin-react-a11y': patch
'eslint-plugin-react-features': patch
'eslint-plugin-reliability': patch
'eslint-plugin-sequelize-security': patch
'eslint-plugin-sqlite-security': patch
'eslint-plugin-typeorm-security': patch
'eslint-plugin-vercel-ai-security': patch
---

fix: point `meta.docs.url` at documentation that exists

`meta.docs.url` is what ESLint hands to editors, CLI output and SARIF, so a wrong
value is a dead "see docs" link in every consumer's IDE. It was wrong for 319 of
478 rules, all pointing at `packages/eslint-plugin/` — a package that does not
exist in this repo.

`withCanonicalDocsUrls` already existed to fix this, but `docsUrlFor` hardcoded
the `/docs/security/` path segment, so it could not express the nine quality
plugins and rollout had stalled at three of twenty-six. The category is now
derived per plugin, and every documented plugin stamps its rules on export.
