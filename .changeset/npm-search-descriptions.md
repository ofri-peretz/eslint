---
'@interlace/eslint-devkit': patch
'@interlace/eslint-formatter-sarif': patch
'@interlace/eslint-formatter': patch
'eslint-plugin-anthropic-security': patch
'eslint-plugin-browser-security': patch
'eslint-plugin-conventions': patch
'eslint-plugin-drizzle-security': patch
'eslint-plugin-express-security': patch
'eslint-plugin-gemini-security': patch
'eslint-plugin-import-next': patch
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
'eslint-plugin-postgresql-security': patch
'eslint-plugin-prisma-security': patch
'eslint-plugin-react-a11y': patch
'eslint-plugin-react-features': patch
'eslint-plugin-reliability': patch
'eslint-plugin-secure-coding': patch
'eslint-plugin-sequelize-security': patch
'eslint-plugin-sqlite-security': patch
'eslint-plugin-supabase-security': patch
'eslint-plugin-typeorm-security': patch
'eslint-plugin-vercel-ai-security': patch
---

docs: npm descriptions lead with what people search for

Each description now opens with the search phrase, such as "ESLint NestJS security rules — …" instead of "ESLint plugin for NestJS security — …". npm search ranks that opening phrase above download counts, so the old wording kept these packages out of the results for searches like "eslint security". The oxlint-plugin-* aliases open the same way, with "Oxlint". No rule or code changes.
