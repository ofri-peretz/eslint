# Link & name map

> **Generated — do not hand-edit.** `npm run map:names` rewrites this file;
> `npm run map:names:check` fails when it is stale. Every hand-maintained
> plugin list in this repo has drifted at least once; this one is derived so
> that when it disagrees with a source file, the source file is what changes.

Covers 30 plugins.

## The eight identifiers a plugin has

| # | Identifier | Shape | Owned by |
| :- | :--- | :--- | :--- |
| 1 | Workspace directory | `packages/eslint-plugin-<name>/` | the filesystem |
| 2 | npm package | `eslint-plugin-<name>` | that package's `package.json#name` |
| 3 | Rule-id prefix | `<name>/<rule>` | the presets in `src/index.ts` |
| 4 | Deprecated alias | a retired prefix, still registered | `DEPRECATED_ALIASES` in `benchmarks/__tests__/plugin-prefix-identity.lock.test.ts` |
| 5 | Docs slug + pillar | `docs/<pillar>/plugin-<slug>` | `apps/docs/src/lib/plugins.ts` |
| 6 | OG banner | `/images/og-<slug>.png` | `apps/docs/scripts/generate-og-images.mjs` |
| 7 | Ecosystem logo | `/logos/<mark>.svg` | `ECOSYSTEM_LOGO` in `tools/scripts/check-readme-structure.ts` |
| 8 | Codecov component | `component_id` + `paths` | `codecov.yml` |

Directory (1), package (2) and prefix (3) must agree letter for letter — the
rule id an adopter copies out of a preset names the plugin key they register.

## Per-plugin

| npm package | v | prefix | alias | docs slug | pillar | logo | docs | OG | codecov |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :-: | :-: | :-: |
| `eslint-plugin-anthropic-security` | 0.3.2 | `anthropic-security/` | — | `plugin-anthropic-security` | security | `claude` | ✅ | ✅ | ❌ |
| `eslint-plugin-browser-security` | 2.1.0 | `browser-security/` | — | `plugin-browser-security` | security | `chromium` | ✅ | ✅ | ✅ |
| `eslint-plugin-conventions` | 5.2.0 | `conventions/` | — | `plugin-conventions` | quality | `—` | ✅ | ✅ | ✅ |
| `eslint-plugin-drizzle-security` | 0.3.5 | `drizzle-security/` | — | `plugin-drizzle-security` | security | `drizzle` | ✅ | ✅ | ❌ |
| `eslint-plugin-express-security` | 3.2.0 | `express-security/` | — | `plugin-express-security` | security | `express` | ✅ | ✅ | ✅ |
| `eslint-plugin-gemini-security` | 0.3.3 | `gemini-security/` | — | `plugin-gemini-security` | security | `gemini` | ✅ | ✅ | ❌ |
| `eslint-plugin-import-next` | 2.7.0 | `import-next/` | — | `plugin-import-next` | quality | `—` | ✅ | ✅ | ✅ |
| `eslint-plugin-jwt-security` | 3.1.0 | `jwt-security/` | `jwt/` | `plugin-jwt-security` | security | `jwt` | ✅ | ✅ | ✅ |
| `eslint-plugin-knex-security` | 0.4.5 | `knex-security/` | — | `plugin-knex-security` | security | `knex` | ✅ | ✅ | ❌ |
| `eslint-plugin-lambda-security` | 2.1.0 | `lambda-security/` | — | `plugin-lambda-security` | security | `lambda` | ✅ | ✅ | ✅ |
| `eslint-plugin-maintainability` | 3.2.0 | `maintainability/` | — | `plugin-maintainability` | quality | `—` | ✅ | ✅ | ✅ |
| `eslint-plugin-mcp-sdk-security` | 0.4.0 | `mcp-sdk-security/` | — | `plugin-mcp-sdk-security` | security | `mcp` | ✅ | ✅ | ❌ |
| `eslint-plugin-modernization` | 3.1.0 | `modernization/` | — | `plugin-modernization` | quality | `—` | ✅ | ✅ | ✅ |
| `eslint-plugin-modularity` | 2.5.0 | `modularity/` | — | `plugin-modularity` | quality | `—` | ✅ | ✅ | ✅ |
| `eslint-plugin-mongodb-security` | 9.1.0 | `mongodb-security/` | — | `plugin-mongodb-security` | security | `mongodb` | ✅ | ✅ | ✅ |
| `eslint-plugin-mysql-security` | 0.3.5 | `mysql-security/` | — | `plugin-mysql-security` | security | `mysql` | ✅ | ✅ | ❌ |
| `eslint-plugin-nestjs-security` | 3.1.0 | `nestjs-security/` | — | `plugin-nestjs-security` | security | `nestjs` | ✅ | ✅ | ✅ |
| `eslint-plugin-node-security` | 5.3.0 | `node-security/` | — | `plugin-node-security` | security | `node` | ✅ | ✅ | ✅ |
| `eslint-plugin-openai-security` | 0.3.2 | `openai-security/` | — | `plugin-openai-security` | security | `openai` | ✅ | ✅ | ❌ |
| `eslint-plugin-operability` | 4.0.0 | `operability/` | — | `plugin-operability` | quality | `—` | ✅ | ✅ | ✅ |
| `eslint-plugin-postgresql-security` | 2.3.0 | `postgresql-security/` | `pg/` | `plugin-postgresql-security` | security | `postgresql` | ✅ | ✅ | ✅ |
| `eslint-plugin-prisma-security` | 0.3.5 | `prisma-security/` | — | `plugin-prisma-security` | security | `prisma` | ✅ | ✅ | ❌ |
| `eslint-plugin-react-a11y` | 2.5.0 | `react-a11y/` | — | `plugin-react-a11y` | quality | `react` | ✅ | ✅ | ✅ |
| `eslint-plugin-react-features` | 1.6.0 | `react-features/` | — | `plugin-react-features` | quality | `react` | ✅ | ✅ | ✅ |
| `eslint-plugin-reliability` | 4.1.0 | `reliability/` | — | `plugin-reliability` | quality | `—` | ✅ | ✅ | ✅ |
| `eslint-plugin-secure-coding` | 5.2.0 | `secure-coding/` | — | `plugin-secure-coding` | security | `—` | ✅ | ✅ | ✅ |
| `eslint-plugin-sequelize-security` | 0.3.5 | `sequelize-security/` | — | `plugin-sequelize-security` | security | `sequelize` | ✅ | ✅ | ❌ |
| `eslint-plugin-sqlite-security` | 0.1.8 | `sqlite-security/` | — | `plugin-sqlite-security` | security | `sqlite` | ✅ | ✅ | ❌ |
| `eslint-plugin-typeorm-security` | 0.3.5 | `typeorm-security/` | — | `plugin-typeorm-security` | security | `typeorm` | ✅ | ✅ | ❌ |
| `eslint-plugin-vercel-ai-security` | 2.1.0 | `vercel-ai-security/` | — | `plugin-vercel-ai-security` | security | `vercel` | ✅ | ✅ | ✅ |

**No codecov component:** `eslint-plugin-anthropic-security`, `eslint-plugin-drizzle-security`, `eslint-plugin-gemini-security`, `eslint-plugin-knex-security`, `eslint-plugin-mcp-sdk-security`, `eslint-plugin-mysql-security`, `eslint-plugin-openai-security`, `eslint-plugin-prisma-security`, `eslint-plugin-sequelize-security`, `eslint-plugin-sqlite-security`, `eslint-plugin-typeorm-security`

## URL shapes

`<slug>` is column 5 above, `<pkg>` column 2. Every docs link from a README or
an article carries `?utm_source=github&utm_medium=referral&utm_campaign=<pkg>`,
stamped by `scripts/stamp-utm-links.ts` — see `UTM_PHILOSOPHY.md`.

| What | Shape |
| :--- | :--- |
| Plugin docs page | `https://eslint.interlace.tools/docs/<pillar>/plugin-<slug>` |
| Rule docs page | `https://eslint.interlace.tools/docs/<pillar>/plugin-<slug>/rules/<rule>` |
| Plugin changelog | `https://eslint.interlace.tools/docs/<pillar>/plugin-<slug>/changelog` |
| npm package | `https://www.npmjs.com/package/<pkg>` |
| Downloads badge | `https://img.shields.io/npm/dt/<pkg>.svg?style=flat-square` |
| Version badge | `https://img.shields.io/npm/v/<pkg>.svg` |
| Codecov badge | `https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?component=<pkg>` |
| OG banner | `https://eslint.interlace.tools/images/og-<slug>.png` |
| Source on GitHub | `https://github.com/ofri-peretz/eslint/tree/main/packages/<pkg>` |
| Rule source doc | `https://github.com/ofri-peretz/eslint/blob/main/packages/<pkg>/docs/rules/<rule>.md` |

**Renamed slugs redirect, never 404.** `apps/docs/next.config.mjs` keeps
`/docs/security/plugin-jwt/*` → `plugin-jwt-security/*` and `plugin-pg/*` →
`plugin-postgresql-security/*`. A redirect is a safety net, not an address —
links we author use the canonical slug.

## Brand marks

Named by **surface**, not by ink: `-light` is for light surfaces (dark ink, npm
and GitHub light), `-dark` is for dark surfaces (light ink, GitHub dark). oxc's
own files use the opposite convention, which has already caused one
wrong-variant commit.

| Mark | Light surface | Dark surface | Base |
| :--- | :--- | :--- | :--- |
| interlace | `/logos/interlace-light.svg` ✅ | `/logos/interlace-dark.svg` ✅ | `/logos/interlace.svg` ✅ |
| eslint | `/logos/eslint-light.svg` ✅ | `/logos/eslint-dark.svg` ✅ | `/logos/eslint.svg` ✅ |
| oxlint | `/logos/oxlint-light.svg` ✅ | `/logos/oxlint-dark.svg` ✅ | `/logos/oxlint.svg` ✅ |

Generated by `tools/scripts/make-theme-variants.mjs`. In a README the three are
written as `<picture>` with the `-light` file as the `<img>` fallback; the ~20
vendor ecosystem marks stay plain `<img>`. The base file is for single-file
consumers and must not appear in a README.

## What enforces each column

| Gate | Holds |
| :--- | :--- |
| `scripts/__tests__/plugin-name-metadata-drift.lock.test.ts` | every plugin name in a machine-read surface resolves to a real directory; registry ↔ `packages/` agree exactly |
| `benchmarks/__tests__/plugin-prefix-identity.lock.test.ts` | prefix (3) equals package suffix (2), and each preset registers the key its rule ids name |
| `apps/docs/src/__tests__/readme-og-banner-lock.test.ts` | every published README banner (6) exists on disk |
| `apps/docs/src/__tests__/remote-markdown-slug-lock.test.ts` | every docs slug (5) resolves to a real package |
| `scripts/__tests__/readme-structure-gate.lock.test.ts` | logo row, section order and the closing mark (7) |
| `packages/eslint-devkit/src/tests/documentation-standards.test.ts` | rule docs reference their own plugin prefix (3) |
| `npm run map:names:check` | this file still matches its sources |

