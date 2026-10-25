---
slug: oxlint-native-plugin-names
opened: 2026-10-25
packages:
  - eslint-devkit
  - eslint-plugin-anthropic-security
  - oxlint-plugin-anthropic-security
  - eslint-plugin-browser-security
  - oxlint-plugin-browser-security
  - eslint-plugin-cli-floor
  - oxlint-plugin-cli-floor
  - eslint-plugin-conventions
  - oxlint-plugin-conventions
  - eslint-plugin-drizzle-security
  - oxlint-plugin-drizzle-security
  - eslint-plugin-express-security
  - oxlint-plugin-express-security
  - eslint-plugin-gemini-security
  - oxlint-plugin-gemini-security
  - eslint-plugin-import-next
  - oxlint-plugin-import-next
  - eslint-plugin-jwt-security
  - oxlint-plugin-jwt-security
  - eslint-plugin-knex-security
  - oxlint-plugin-knex-security
  - eslint-plugin-lambda-security
  - oxlint-plugin-lambda-security
  - eslint-plugin-maintainability
  - oxlint-plugin-maintainability
  - eslint-plugin-mcp-sdk-security
  - oxlint-plugin-mcp-sdk-security
  - eslint-plugin-modernization
  - oxlint-plugin-modernization
  - eslint-plugin-modularity
  - oxlint-plugin-modularity
  - eslint-plugin-mongodb-security
  - oxlint-plugin-mongodb-security
  - eslint-plugin-mysql-security
  - oxlint-plugin-mysql-security
  - eslint-plugin-nestjs-security
  - oxlint-plugin-nestjs-security
  - eslint-plugin-node-security
  - oxlint-plugin-node-security
  - eslint-plugin-openai-security
  - oxlint-plugin-openai-security
  - eslint-plugin-operability
  - oxlint-plugin-operability
  - eslint-plugin-postgresql-security
  - oxlint-plugin-postgresql-security
  - eslint-plugin-prisma-security
  - oxlint-plugin-prisma-security
  - eslint-plugin-react-a11y
  - oxlint-plugin-react-a11y
  - eslint-plugin-react-features
  - oxlint-plugin-react-features
  - eslint-plugin-reliability
  - oxlint-plugin-reliability
  - eslint-plugin-secure-coding
  - oxlint-plugin-secure-coding
  - eslint-plugin-sequelize-security
  - oxlint-plugin-sequelize-security
  - eslint-plugin-sqlite-security
  - oxlint-plugin-sqlite-security
  - eslint-plugin-supabase-security
  - oxlint-plugin-supabase-security
  - eslint-plugin-typeorm-security
  - oxlint-plugin-typeorm-security
  - eslint-plugin-vercel-ai-security
  - oxlint-plugin-vercel-ai-security
cases: []
---

# Intent — an oxlint user installs our rules by an oxlint name, and gets no ESLint

**Status:** review · **Opened:** 2026-10-25 · **Owner:** @ofri-peretz

---

## What is wanted

A Vite+ or oxlint user can run `npm i -D oxlint-plugin-<name>`, add it to
`jsPlugins`, and get the same `<name>/<rule>` rule IDs that `eslint-plugin-<name>`
gives ESLint users. That install does not pull ESLint in. All 32 rule plugins work
this way, and no rule logic is copied to do it.

## Why now

- **Vite+ 1.0 shipped on 2026-09-28** (VoidZero, now part of Cloudflare). It
  replaces ESLint and its plugins with one `vite-plus` dependency, and it runs
  third-party rules as oxlint JS plugins. People searching npm for oxlint plugins
  search for `oxlint-plugin-*`. Our rules have run on oxlint since the
  `./oxlint` sub-export, but nothing is published under a name those people look
  for.
- **An alias would already get the right IDs.** In oxlint@1.74.0 (the version
  installed here), `getPluginName` reads the prefix from the plugin's
  `meta.name`, not from the package name. It then passes it through
  `normalizePluginName`, which strips `eslint-plugin-` and `oxlint-plugin-` the
  same way (`node_modules/oxlint/dist/lint.js`). Our `./oxlint` export sets
  `meta.name: 'eslint-plugin-postgresql-security'`. So a package named
  `oxlint-plugin-postgresql-security` that re-exports it gets the same
  `postgresql-security/...` IDs. Only the package name is missing.
- **All 32 `oxlint-plugin-<name>` names were free on npm** on 2026-10-25
  (`npm view oxlint-plugin-<name> version` → 404 for each).
- **Our plugins force ESLint onto people who don't use it.** All 32 plugins, and
  `@interlace/eslint-devkit`, declare `eslint` as a required peer with no
  `peerDependenciesMeta`. npm 7+ installs required peers automatically. Measured
  2026-10-25 in an empty project:
  `npm install eslint-plugin-postgresql-security --dry-run` adds **79 packages,
  including `eslint@10.13.0`**. With `--omit=peer` it adds **2**. The devkit
  source already avoids runtime imports of `eslint`, `@typescript-eslint/*` and
  `typescript` (see `module-evidence.ts`, `type-utils.ts`), so the peer is the only
  thing pulling them in.

## Affected users and systems

- oxlint and Vite+ users: they get a package name they can find, and 77 fewer
  packages per install.
- ESLint users: nothing changes. An optional peer is still range-checked when it is
  installed.
- `packages/`: 32 new alias packages next to the plugins they point at.
- `.changeset/config.json`: 32 `fixed` pairs.
- `release.yml` publishes every non-private `packages/*` package it doesn't find on
  npm, **on every push to `main`**. So merging the aliases is the same as
  publishing them, unless they land marked `private` (see open questions).
- Every script and lock that loops over `packages/*`. 24 of them don't filter to
  `eslint-plugin-*`, so they will see the aliases.

## Constraints

- **No duplicated rule logic** (PRINCIPLES: each package an independent product,
  one source of truth). An alias is a manifest plus a single `require` line.
- **Rule IDs are a published contract.** Each alias exposes exactly the rule set
  of its `eslint-plugin-*`, under the same prefix.
- **Zero new runtime dependencies** for the aliases beyond the plugin they point
  at.
- **No publishing from this work.** This agent does not run `npm publish`. Ofri
  decides when the aliases first reach npm, at the Deploy gate.
- No hand-written copies. The 32 packages come from one generator, and a drift
  check fails when they don't match it.

## Success criteria

- `npm run oxlint:aliases:check` exits 0. It fails if any alias is missing,
  hand-edited, or out of version lockstep with its plugin.
- A lock test loads each `oxlint-plugin-<name>` through oxlint's `jsPlugins` and
  asserts that its rule IDs equal the `eslint-plugin-<name>` rule set, all prefixed
  `<name>/`. It fails on `origin/main` before this change, because the packages
  don't exist there.
- A lock test asserts that every published package's `eslint` peer is marked
  `optional`. It fails on `origin/main` before this change: 33 packages violate it.
- After the aliases are published, `npm install oxlint-plugin-postgresql-security
--dry-run` in an empty project adds no `eslint` package.

## Open questions

1. **Publish on merge, or later?** `release.yml` will publish all 32 aliases as
   first releases on the first push to `main` after merge. The recommendation is
   to land them with `"private": true`, which makes auto-merge safe. Flipping that
   field is then a one-line follow-up PR when Ofri decides to go live.
2. **How does the first publish authenticate?** npm Trusted Publishing is set per
   package, and a package has to exist before you can set it. The first release of
   each new name falls back to `NPM_TOKEN`, so that token has to be able to create
   new packages. **Needs checking before the flip.**
3. ~~19 packages~~: `origin/main` has **32** rule plugins (as of 2026-10-25). The
   intent covers all of them.
