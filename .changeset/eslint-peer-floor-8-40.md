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

Raise the ESLint peer floor to 8.40.0: `^8.40.0 || ^9.0.0 || ^10.0.0`.

The range said `^8.0.0`, which is a compatibility claim we could not back.
`context.sourceCode` and `context.filename` were added in ESLint 8.40.0 and are
`undefined` on 8.0.0–8.39.x. Our rules read them at 333 call sites across 231 files in 22
packages, so on 8.39.x a rule can fail before it reports anything.

Nothing tested the claim either: the version matrix installs `eslint@^8`, and
npm resolves that to the newest v8 — no CI job has ever run against 8.39.x or
below. The floor now names the oldest minor the rules actually run on.

**Impact:** none for anyone on a supported ESLint. 8.40.0 shipped in May 2023
and the v8 line ended at 8.57.x, so every v8 install resolving through a caret
already lands above the new floor. Consumers pinned below 8.40.0 will now see
an npm peer warning at install time instead of a crash inside a rule.

Locked by `scripts/__tests__/eslint-peer-floor.test.ts`, which fails on any
manifest admitting a v8 below 8.40.0 and separately asserts the source really
does read those APIs — so the floor cannot decay into an unexplained constant.
