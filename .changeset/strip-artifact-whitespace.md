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

Ship the JavaScript without tsc's layout.

Every emitted `.js` is re-written through esbuild's `minifyWhitespace`, which
removes indentation and line breaks. Across the ecosystem that is 3233 kB ->
2023 kB of shipped JavaScript, a 37% cut; on disk a package install drops about
28%. Indentation alone was ~32% of a compiled rule file.

This is deliberately NOT minification. Identifiers keep their names, string
contents are untouched, and the syntax tree is not rewritten — rule `meta`
(messages, schema, docs URLs) stays byte-identical, which is what the docs site
and `--print-config` read, and a stack trace from inside a rule still names
the function it came from. Full mangling would have bought another 4 kB gzipped
and cost both.

Verified against the published artifact: identical lint findings including
message IDs, identical rule names, and zero differences across every rule's
meta, messages, schema and presets.
