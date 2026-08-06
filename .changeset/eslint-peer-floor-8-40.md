---
'@interlace/eslint-devkit': patch
'eslint-plugin-anthropic-security': patch
'eslint-plugin-browser-security': patch
'eslint-plugin-conventions': patch
'eslint-plugin-drizzle-security': patch
'eslint-plugin-express-security': patch
'eslint-plugin-gemini-security': patch
'eslint-plugin-import-next': patch
'eslint-plugin-jwt': patch
'eslint-plugin-jwt-security': patch
'eslint-plugin-knex-security': patch
'eslint-plugin-lambda-security': patch
'eslint-plugin-maintainability': patch
'eslint-plugin-mcp-sdk-security': patch
'eslint-plugin-modernization': patch
'eslint-plugin-modularity': patch
'eslint-plugin-mongodb-security': patch
'eslint-plugin-mysql-security': patch
'eslint-plugin-nestjs-security': patch
'eslint-plugin-node-security': patch
'eslint-plugin-openai-security': patch
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
'eslint-plugin-vercel-ai-security': patch
---

Correct the declared ESLint floor: `^8.0.0` → `^8.40.0`.

`context.sourceCode` landed in ESLint 8.40. The shared devkit reads it without a
fallback and 20 plugins read it directly, so on ESLint 8.0–8.39 the install
resolved cleanly and then every rule threw
`Cannot read properties of undefined (reading 'ast')` at lint time — npm reported
nothing, because the manifest claimed the version was supported.

Measured on 8.0.0 / 8.39.0 (throw on load) versus 8.40.0 / 8.57.1 / 9.0.0 /
9.39.2 / 10.8.0 (all produce the expected finding). No runtime behaviour
changes; this only makes the manifest match what the code can actually run.
