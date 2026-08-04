---
'@interlace/eslint-devkit': patch
'eslint-plugin-browser-security': patch
'eslint-plugin-conventions': patch
'eslint-plugin-drizzle-security': patch
'eslint-plugin-express-security': patch
'eslint-plugin-import-next': patch
'eslint-plugin-jwt': patch
'eslint-plugin-knex-security': patch
'eslint-plugin-lambda-security': patch
'eslint-plugin-maintainability': patch
'eslint-plugin-modernization': patch
'eslint-plugin-modularity': patch
'eslint-plugin-mongodb-security': patch
'eslint-plugin-mysql-security': patch
'eslint-plugin-nestjs-security': patch
'eslint-plugin-node-security': patch
'eslint-plugin-operability': patch
'eslint-plugin-pg': patch
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

Declare what we support, load only what we use

**`tslib` is gone from every package.** It was a NON-optional peer of
`@interlace/eslint-devkit`, so all 26 plugins declared it as a dependency to
satisfy that peer — 124 kB every consumer installed so twelve
`require("tslib")` calls could resolve. The shipped JavaScript now inlines
the TypeScript helpers instead (`--importHelpers false` on the emit pass that
already re-writes it), costing ~9.5 kB in devkit. Zero `tslib` requires remain
anywhere; verified by installing every plugin with no `tslib` in the tree and
loading all 26 with every rule intact.

**`eslint-plugin-import-next` had a phantom dependency.** Its rules
`require("typescript")` at module load, but it was declared in neither
`dependencies` nor `peerDependencies` — it worked only because something else
in the tree happened to install it. A clean install crashed the whole plugin,
not just the type-aware rules. `typescript` is now a required peer, which is
what the code actually needs.

**23 "technologies we support" declarations did nothing.** Seven plugins
listed their target libraries in `peerDependenciesMeta` with no matching
`peerDependencies` entry, and npm ignores meta for a package that is not
declared a peer — verified by installing `eslint-plugin-express-security` and
watching nothing install and nothing warn. `eslint-plugin-jwt` appeared to
support six JWT libraries and formally supported none. All 23 are now real
optional peers, matching the convention `pg`, `mongodb`, `prisma` and the
other nine already followed:

| plugin | technologies now actually declared |
|---|---|
| `eslint-plugin-jwt` | jsonwebtoken, @nestjs/jwt, express-jwt, jose, jwks-rsa, jwt-decode |
| `eslint-plugin-lambda-security` | @aws-sdk/client-lambda, @middy/core, @middy/http-cors, @middy/http-security-headers, @middy/validator |
| `eslint-plugin-express-security` | express, helmet, cors, csurf, express-rate-limit |
| `eslint-plugin-nestjs-security` | @nestjs/common, @nestjs/throttler, class-validator, class-transformer |
| `eslint-plugin-vercel-ai-security` | ai |
| `eslint-plugin-maintainability`, `eslint-plugin-react-features` | typescript |

All optional, so nothing is installed on the consumer’s behalf — the
declaration is the supported-technology signal, which is exactly what it was
meant to be.

**A new gate compares declared dependencies against what the emitted
JavaScript actually loads**, in both directions: a `require` with no
declaration (works until someone installs cleanly) and a declaration nothing
requires (weight every consumer pays). It understands that a dependency may
exist to satisfy an optional peer of another dependency, which is why
`eslint-plugin-import-next` legitimately declares `oxc-resolver` that devkit
lazily loads.
