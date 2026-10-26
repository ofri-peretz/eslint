---
'eslint-plugin-anthropic-security': minor
'oxlint-plugin-anthropic-security': minor
'eslint-plugin-browser-security': minor
'oxlint-plugin-browser-security': minor
'eslint-plugin-cli-floor': minor
'oxlint-plugin-cli-floor': minor
'eslint-plugin-conventions': minor
'oxlint-plugin-conventions': minor
'eslint-plugin-drizzle-security': minor
'oxlint-plugin-drizzle-security': minor
'eslint-plugin-express-security': minor
'oxlint-plugin-express-security': minor
'eslint-plugin-gemini-security': minor
'oxlint-plugin-gemini-security': minor
'eslint-plugin-import-next': minor
'oxlint-plugin-import-next': minor
'eslint-plugin-jwt-security': minor
'oxlint-plugin-jwt-security': minor
'eslint-plugin-knex-security': minor
'oxlint-plugin-knex-security': minor
'eslint-plugin-lambda-security': minor
'oxlint-plugin-lambda-security': minor
'eslint-plugin-maintainability': minor
'oxlint-plugin-maintainability': minor
'eslint-plugin-mcp-sdk-security': minor
'oxlint-plugin-mcp-sdk-security': minor
'eslint-plugin-modernization': minor
'oxlint-plugin-modernization': minor
'eslint-plugin-modularity': minor
'oxlint-plugin-modularity': minor
'eslint-plugin-mongodb-security': minor
'oxlint-plugin-mongodb-security': minor
'eslint-plugin-mysql-security': minor
'oxlint-plugin-mysql-security': minor
'eslint-plugin-nestjs-security': minor
'oxlint-plugin-nestjs-security': minor
'eslint-plugin-node-security': minor
'oxlint-plugin-node-security': minor
'eslint-plugin-openai-security': minor
'oxlint-plugin-openai-security': minor
'eslint-plugin-operability': minor
'oxlint-plugin-operability': minor
'eslint-plugin-postgresql-security': minor
'oxlint-plugin-postgresql-security': minor
'eslint-plugin-prisma-security': minor
'oxlint-plugin-prisma-security': minor
'eslint-plugin-react-a11y': minor
'oxlint-plugin-react-a11y': minor
'eslint-plugin-react-features': minor
'oxlint-plugin-react-features': minor
'eslint-plugin-reliability': minor
'oxlint-plugin-reliability': minor
'eslint-plugin-secure-coding': minor
'oxlint-plugin-secure-coding': minor
'eslint-plugin-sequelize-security': minor
'oxlint-plugin-sequelize-security': minor
'eslint-plugin-sqlite-security': minor
'oxlint-plugin-sqlite-security': minor
'eslint-plugin-supabase-security': minor
'oxlint-plugin-supabase-security': minor
'eslint-plugin-typeorm-security': minor
'oxlint-plugin-typeorm-security': minor
'eslint-plugin-vercel-ai-security': minor
'oxlint-plugin-vercel-ai-security': minor
'@interlace/eslint-devkit': minor
---

feat: every rule runs natively on oxlint and Vite+, published as `oxlint-plugin-<name>` too

- **`oxlint-plugin-<name>`**: each plugin now has an oxlint-native twin on npm,
  for installs from oxlint or Vite+ (`lint.jsPlugins: ['oxlint-plugin-<name>']`
  in `vite.config.ts`). It re-exports the same rules under the same
  `<name>/<rule>` IDs, at the same version, and does not install ESLint.
- **`createOnce`**: 457 of 473 rule definitions are written in oxlint's
  `createOnce` shape, with per-file state reset in `before()`. ESLint runs the
  same rule object through a `create` the devkit derives from it, so ESLint
  behaviour is unchanged: every existing test passes, and oxlint parity on the
  benchmark corpus stays at 100% (3,932 shared findings, none on one engine
  only). The remaining 16 are listed, with reasons, in
  `.agent/create-rule-allowlist.json`.
- **`meta.interop.runtimes`**: every rule now states where it is known to
  behave identically. `['eslint', 'oxlint']` means its own test suite passes
  on oxlint's RuleTester as well as ESLint's, and the tests enforce that on
  every run; type-aware rules stay `['eslint']`. The ESLint-only rules and the
  reason for each are listed in `docs/oxlint-runtimes.md`.
