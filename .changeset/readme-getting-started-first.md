---
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
'oxlint-plugin-anthropic-security': patch
'oxlint-plugin-browser-security': patch
'oxlint-plugin-conventions': patch
'oxlint-plugin-drizzle-security': patch
'oxlint-plugin-express-security': patch
'oxlint-plugin-gemini-security': patch
'oxlint-plugin-import-next': patch
'oxlint-plugin-jwt-security': patch
'oxlint-plugin-knex-security': patch
'oxlint-plugin-lambda-security': patch
'oxlint-plugin-maintainability': patch
'oxlint-plugin-mcp-sdk-security': patch
'oxlint-plugin-modernization': patch
'oxlint-plugin-modularity': patch
'oxlint-plugin-mongodb-security': patch
'oxlint-plugin-mysql-security': patch
'oxlint-plugin-nestjs-security': patch
'oxlint-plugin-node-security': patch
'oxlint-plugin-openai-security': patch
'oxlint-plugin-operability': patch
'oxlint-plugin-postgresql-security': patch
'oxlint-plugin-prisma-security': patch
'oxlint-plugin-react-a11y': patch
'oxlint-plugin-react-features': patch
'oxlint-plugin-reliability': patch
'oxlint-plugin-secure-coding': patch
'oxlint-plugin-sequelize-security': patch
'oxlint-plugin-sqlite-security': patch
'oxlint-plugin-supabase-security': patch
'oxlint-plugin-typeorm-security': patch
'oxlint-plugin-vercel-ai-security': patch
---

docs: Getting Started now leads each plugin README, with the ESLint install line and a flat config that loads

The install block was below the Description and the doctrine, and on 17 of the 31 plugins there was no flat-config snippet on the page at all. `eslint-plugin-secure-coding`'s README showed `...securePlugin.configs.recommended`, which throws `TypeError: ... is not iterable` when pasted, because `configs.recommended` is one object. Every plugin README now opens with `npm install --save-dev eslint <plugin>` and `import { configs } from '<plugin>'` and `export default [configs.recommended]` in an `eslint.config.mjs`, then the Description. A test now loads that snippet in ESLint for every plugin.

The star banner above the first heading, the footer block with the star counter and the Dev.to ask are replaced by one `## Support` paragraph at the end: report a false positive, or star the repo if the plugin helped.

`eslint-plugin-import-next` opens with its drop-in grade, read from the newest `benchmarks/results/ilb-import-parity` result with its date: passes 2,035 of 2,135 (95.3%) of eslint-plugin-import 2.32.0's own test cases, measured 2026-11-19.

Eight taglines now say what the plugin flags instead of "security rules for X" (secure-coding, node-security, browser-security, nestjs-security, express-security, vercel-ai-security, react-a11y, import-next). `eslint-plugin-node-security` adds one proof line: the public repositories that list it, with the date they were checked.
