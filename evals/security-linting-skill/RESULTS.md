# security-linting skill: with and without

Measured 2026-11-20 by `npm run eval:security-linting-skill -- --write`. Not a claim about assistants: it measures the config the skill specifies, rendered by `skills/security-linting/scripts/render-config.mjs`, on three fixture apps in `evals/security-linting-skill/apps/`.

- Without: the app's existing flat config, or `eslint-plugin-security` alone where the app has none.
- With: the rendered config, patched into the existing one without removing a line of it.
- Engines: ESLint 9.39.4 and 10.14.0. `eslint-plugin-security` 4.2.1. Interlace plugins are the local workspace builds (`packages/*/dist`), not registry installs.
- Exit code is non-zero if a config fails to load, a planted issue the harness requires is not flagged, a finding present without is lost with, or the two ESLint majors disagree.

| App            | Engine    | Findings without | Findings with | Planted issues flagged without | Planted issues flagged with | New rule ids |
| :------------- | :-------- | ---------------: | ------------: | -----------------------------: | --------------------------: | -----------: |
| express-pg     | ESLint 9  |                2 |            14 |                            0/7 |                         7/7 |           12 |
| express-pg     | ESLint 10 |                2 |            14 |                            0/7 |                         7/7 |           12 |
| nest           | ESLint 9  |                1 |             4 |                            0/3 |                         3/3 |            3 |
| nest           | ESLint 10 |                1 |             4 |                            0/3 |                         3/3 |            3 |
| react          | ESLint 9  |                0 |             5 |                            0/4 |                         4/4 |            4 |
| react          | ESLint 10 |                0 |             5 |                            0/4 |                         4/4 |            4 |
| all 23 plugins | ESLint 9  |                - |         loads |                            n/a |                         n/a |            - |
| all 23 plugins | ESLint 10 |                - |         loads |                            n/a |                         n/a |            - |

Planted issues that no rule flagged (recorded, not required):

- express-pg: express-security/require-helmet (not flagged)
- express-pg: express-security/require-rate-limiting (not flagged)
- nest: nestjs-security/require-guards (not flagged)

Read it as a floor, not a score: "findings" counts every message including the baseline's, and the fixtures were written by us, so they show the wiring works, not how often these rules are right on your code. For that, see the measurement on the docs page "Use alongside eslint-plugin-security".

Plugin versions measured: eslint-plugin-anthropic-security@2.0.2, eslint-plugin-browser-security@3.1.0, eslint-plugin-drizzle-security@2.0.2, eslint-plugin-express-security@4.0.3, eslint-plugin-gemini-security@2.0.2, eslint-plugin-jwt-security@4.0.2, eslint-plugin-knex-security@2.0.2, eslint-plugin-lambda-security@3.0.3, eslint-plugin-mcp-sdk-security@2.1.0, eslint-plugin-mongodb-security@10.0.2, eslint-plugin-mysql-security@2.0.2, eslint-plugin-nestjs-security@4.2.1, eslint-plugin-node-security@6.0.6, eslint-plugin-openai-security@2.0.2, eslint-plugin-postgresql-security@3.0.4, eslint-plugin-prisma-security@2.0.2, eslint-plugin-secure-coding@6.1.2, eslint-plugin-sequelize-security@2.0.2, eslint-plugin-sqlite-security@2.0.2, eslint-plugin-supabase-security@2.0.2, eslint-plugin-typeorm-security@2.0.2, eslint-plugin-vercel-ai-security@3.0.3.
