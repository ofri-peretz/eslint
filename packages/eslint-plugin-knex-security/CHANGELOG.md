# eslint-plugin-knex-security

## 0.4.2

### Patch Changes

- [#407](https://github.com/ofri-peretz/eslint/pull/407) [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Correct the declared ESLint floor: `^8.0.0` → `^8.40.0`.

  `context.sourceCode` landed in ESLint 8.40. The shared devkit reads it without a
  fallback and 20 plugins read it directly, so on ESLint 8.0–8.39 the install
  resolved cleanly and then every rule threw
  `Cannot read properties of undefined (reading 'ast')` at lint time — npm reported
  nothing, because the manifest claimed the version was supported.

  Measured on 8.0.0 / 8.39.0 (throw on load) versus 8.40.0 / 8.57.1 / 9.0.0 /
  9.39.2 / 10.8.0 (all produce the expected finding). No runtime behaviour
  changes; this only makes the manifest match what the code can actually run.

- [#423](https://github.com/ofri-peretz/eslint/pull/423) [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Correct the ESLint peer range shown in the README Compatibility table.

  The manifest floor moved to 8.40.0, but every package README still advertised
  `^8.0.0 || ^9.0.0 || ^10.0.0`. The README is what npm renders on the package
  page, so the requirement consumers actually read disagreed with the one npm
  enforced: an install on 8.39.x warns about a peer conflict while the README
  says that version is supported.

  The range was missed by the original sweep because a markdown table escapes
  the union as `\|\|`, so a grep for the plain shape matched none of the 29
  files.

  Also updates `.agent/rules/readme-structure.md` and
  `.agent/compatibility-matrix.md`, which template this table for new packages,
  and adds a README-vs-manifest assertion to
  `scripts/__tests__/eslint-peer-floor.test.ts` so the two cannot drift again.

- Updated dependencies [[`b59e984`](https://github.com/ofri-peretz/eslint/commit/b59e984f8f98dcb59e6bd5d4ef23a75376821d17), [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25), [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211)]:
  - @interlace/eslint-devkit@1.11.0

## 0.4.1

### Patch Changes

- [#411](https://github.com/ofri-peretz/eslint/pull/411) [`d0cc8b6`](https://github.com/ofri-peretz/eslint/commit/d0cc8b647a41c1a85950c87a60296ece0f3abc31) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Ship the JavaScript without tsc's layout.

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

- Updated dependencies [[`7663cfd`](https://github.com/ofri-peretz/eslint/commit/7663cfda0d2c41b4c7dc0b4c680550cb74a27faa), [`d0cc8b6`](https://github.com/ofri-peretz/eslint/commit/d0cc8b647a41c1a85950c87a60296ece0f3abc31)]:
  - @interlace/eslint-devkit@1.10.0

## 0.4.0

### Minor Changes

- [#386](https://github.com/ofri-peretz/eslint/pull/386) [`81acd9c`](https://github.com/ofri-peretz/eslint/commit/81acd9ca270940529b455fbfa685b842b8cfe982) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add `no-hardcoded-credentials` (CWE-798) to the knex, mysql, Sequelize and
  TypeORM plugins, via a new shared `createHardcodedCredentialsRule` factory.

  A password in source is a password in git history, in every fork, and in every
  layer of the built image. Deleting the line later changes nothing — a real fix
  means rotating the credential _and_ rewriting history, so the only cheap moment
  is before it lands.

  The detection generalizes what `eslint-plugin-postgresql-security` has shipped
  for pg, and tightens two false positives in the process:

  - A connection URL is a finding only when it embeds a password. The pg version
    reports any `postgres://…` literal, including `postgres://localhost:5432/app`,
    which is safe to commit.
  - A credential key is a finding only when its value is a non-empty string
    literal, so `password: ''` (the local trust-auth sentinel) stays silent.

  It also refuses to treat the credential as its own evidence: an object must name
  somewhere to connect _to_ — `host`, `port`, `database`, `connectionString` —
  before its `password` counts. Without that, `{ user, password }` makes the login
  form of every app with a database a finding.

- [#389](https://github.com/ofri-peretz/eslint/pull/389) [`8e238ea`](https://github.com/ofri-peretz/eslint/commit/8e238ea3a7f18aa47c6d02368c6023d8575deca4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add `no-mass-assignment` (CWE-915) to the five ORM plugins with object writes,
  via a new shared `createMassAssignmentRule` factory.

  ```ts
  await prisma.user.update({ where: { id }, data: req.body });
  await User.create(req.body);
  await db.insert(users).values({ ...req.body });
  ```

  Each of those updates the fields the endpoint is about — and every other column
  on the model: `role`, `isAdmin`, `ownerId`, `emailVerified`, `credits`. None of
  them appear in the diff, which is why the shape survives review.

  It also gets worse without anyone touching it: adding a sensitive column to a
  model later silently widens every existing mass-assignment site. No line
  changes, and the exposure is new.

  Silent by design: a payload that names its fields (`{ name: req.body.name }`) is
  the fix; an object that merely has a `body` key (`form.body`) is not a request;
  `ctx.data` is ordinary application state in several frameworks; and a value the
  rule cannot see through is not guessed at.

  No options, deliberately. An allowlist would let a project re-approve the
  dangerous shape wholesale, one config file further from the call site.

  mysql2 and better-sqlite3 do not carry this rule — their writes are raw SQL
  strings, already covered by `no-unsafe-query`.

### Patch Changes

- Updated dependencies [[`6f5f164`](https://github.com/ofri-peretz/eslint/commit/6f5f164c7461d66f17689039d19fa9d7d84111ef), [`5980f89`](https://github.com/ofri-peretz/eslint/commit/5980f89a65113e43d504ecc72a86d61aa1e522cb), [`81acd9c`](https://github.com/ofri-peretz/eslint/commit/81acd9ca270940529b455fbfa685b842b8cfe982), [`8e238ea`](https://github.com/ofri-peretz/eslint/commit/8e238ea3a7f18aa47c6d02368c6023d8575deca4), [`0cbcc46`](https://github.com/ofri-peretz/eslint/commit/0cbcc46f89258c888de7354cf24b90c316df43b0)]:
  - @interlace/eslint-devkit@1.9.0

## 0.3.0

### Minor Changes

- [#373](https://github.com/ofri-peretz/eslint/pull/373) [`e5d31ab`](https://github.com/ofri-peretz/eslint/commit/e5d31abb924de8473ba64093d6d514f3c44049ae) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add `require-tls` (CWE-319) to the Knex, mysql2, Sequelize and TypeORM security plugins.

  Reports two distinct failures, because they do not share a remediation:

  - **`tlsDisabled`** — the connection is plaintext (`ssl: false`, `?sslmode=disable`).
    Every query, every row and the credentials that open the session cross the
    network in the clear.
  - **`certificateValidationDisabled`** — `rejectUnauthorized: false` (or
    `trustServerCertificate: true` on mssql, which inverts the polarity). The
    traffic is encrypted but the server is never authenticated, so the client
    completes a handshake just as willingly with whoever answered in the
    database's place. The fix is to supply the CA, never to switch the check off.

  The detection gate is a _database connection config_ — driver import plus a
  connection-shaped sibling key — which is what keeps the rule out of
  `eslint-plugin-node-security`, where a bare `rejectUnauthorized: false` would
  also match every https agent and fetch option in the repo, and double-report
  this line from two plugins.

  A value the rule cannot read statically (`ssl: useTls`) is never reported. That
  is a deliberate false negative in exchange for findings that are always real.

  Not shipped for `prisma-security` (connection config lives in `schema.prisma`,
  not JavaScript), `drizzle-security` (delegates connection setup to the
  underlying driver, which its own plugin covers) or `sqlite-security` (a local
  file, no network to protect).

### Patch Changes

- [#381](https://github.com/ofri-peretz/eslint/pull/381) [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Load rule modules on demand instead of at plugin load.

  Every plugin barrel used to `require` all of its rules the moment ESLint loaded
  the plugin, whether or not your config enabled them. `plugin.rules[id]` is only
  ever read for rules a config turns on, so the rest was parse-and-compile cost
  for code that never ran.

  The published entry now exposes each rule behind a getter, so a rule module is
  read the first time something asks for it. Measured on a 7-plugin config with 34
  rules enabled: 163 rule modules loaded and 251 ms of plugin load, against 34
  modules and 8.5 ms — total ESLint wall time 251 ms → 109 ms. On a preset that
  enables most of a plugin (`node-security/recommended`, 25 of 37) it is a wash,
  72 ms → 65 ms. It is never slower; the win scales with how many plugins you
  stack and how few of their rules you use.

  Nothing about the plugin API changes. `Object.keys(plugin.rules)` still lists
  every rule without loading any of them, repeated reads return the same object,
  and the `./oxlint` sub-export is the same plugin object it always was.

  `eslint-plugin-jwt` and `eslint-plugin-vercel-ai-security` also re-export their
  rule objects as named top-level exports, which cannot be deferred — those two
  keep loading eagerly.

- [#381](https://github.com/ofri-peretz/eslint/pull/381) [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Declare what we support, load only what we use

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

  | plugin                                                          | technologies now actually declared                                                                    |
  | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
  | `eslint-plugin-jwt`                                             | jsonwebtoken, @nestjs/jwt, express-jwt, jose, jwks-rsa, jwt-decode                                    |
  | `eslint-plugin-lambda-security`                                 | @aws-sdk/client-lambda, @middy/core, @middy/http-cors, @middy/http-security-headers, @middy/validator |
  | `eslint-plugin-express-security`                                | express, helmet, cors, csurf, express-rate-limit                                                      |
  | `eslint-plugin-nestjs-security`                                 | @nestjs/common, @nestjs/throttler, class-validator, class-transformer                                 |
  | `eslint-plugin-vercel-ai-security`                              | ai                                                                                                    |
  | `eslint-plugin-maintainability`, `eslint-plugin-react-features` | typescript                                                                                            |

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

- [#335](https://github.com/ofri-peretz/eslint/pull/335) [`47cde07`](https://github.com/ofri-peretz/eslint/commit/47cde07f13fb128e973a46f2a66a68c3419cdef3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix the `./oxlint` subpath export, which pointed at `src/oxlint.js` — a file no build produces. `require('<package>/oxlint')` threw MODULE_NOT_FOUND on every published package, while every README documented that exact wiring for oxlint's `jsPlugins`. The export now points at the build output, `dist/src/oxlint.js`.

  The path was hardcoded in `scripts/generate-oxlint-shims.ts`, so the generator rewrote any manual correction back to the broken value on the next drift check — fixed there rather than per package.

  This release also carries npm provenance: the affected packages were last published from a workstation, which has no OIDC token to attest with, so the published tarballs had no attestation. Publishing through the release workflow signs them.

- Updated dependencies [[`85e57a7`](https://github.com/ofri-peretz/eslint/commit/85e57a7c2facace33cae73749f6385fb8c7da41b), [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98), [`e5d31ab`](https://github.com/ofri-peretz/eslint/commit/e5d31abb924de8473ba64093d6d514f3c44049ae), [`1fb1cad`](https://github.com/ofri-peretz/eslint/commit/1fb1caddf8e5c20d43de9cede5d66565b297bee6), [`d1a3d8c`](https://github.com/ofri-peretz/eslint/commit/d1a3d8c62778ed027a8c522a3cf9b12a3b1c90b9)]:
  - @interlace/eslint-devkit@1.8.0

## 0.2.1

### Patch Changes

- [#364](https://github.com/ofri-peretz/eslint/pull/364) [`86baa02`](https://github.com/ofri-peretz/eslint/commit/86baa026485bf93d63f1523d6eb382e0a40cbb3f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the ecosystem and oxlint marks to the README logo row. Each plugin now
  leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
  postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
  vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
  without an ecosystem mark. README-only change - no rule behaviour is affected.
  The patch bump is what carries the new README onto npm, which only refreshes a
  package README on publish.

## 0.2.0

### Minor Changes

- [#353](https://github.com/ofri-peretz/eslint/pull/353) [`e8e9ee6`](https://github.com/ofri-peretz/eslint/commit/e8e9ee6d521bac301d0554e54ec22afbe8f49e98) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add `no-unscoped-mutation` (CWE-284) to the Prisma, Drizzle and Knex plugins

  Every ORM ships a bulk mutation whose _unscoped_ form rewrites or deletes the
  whole table. `prisma.user.deleteMany()`, `db.delete(users)`, `knex('users').del()`
  — each one type-checks, passes review, and only shows up once it has run against
  production data. `eslint-plugin-drizzle`'s entire published surface is this single
  check for a single ORM; this generalizes it.

  The detection lives in one place, `createUnscopedMutationRule` in
  `@interlace/eslint-devkit`, and each plugin instantiates it with its own sinks and
  remediation copy — the same shape `createSqlInjectionRule` already uses. Each
  plugin declares where its scope lives: an options-object filter for Prisma, a
  chained `.where*()` for Drizzle and Knex.

  Every instantiation is gated on the driver: the rule is silent in files that
  never import it, and silent on receivers that do not read as a driver handle.
  Without that gate, `delete` and `update` would match `map.delete(key)` and
  `store.update(patch)` — method names alone are not discriminators.

  | Plugin             | Sinks                      | Where scope comes from             |
  | :----------------- | :------------------------- | :--------------------------------- |
  | `prisma-security`  | `deleteMany`, `updateMany` | `{ where }` in the options object  |
  | `drizzle-security` | `delete`, `update`         | a chained `.where()`               |
  | `knex-security`    | `del`, `delete`, `update`  | any of the chained `where*` family |

  `argumentRole` is the one thing that cannot be inferred from the AST. A lone
  identifier argument is the _filter_ for Prisma (`deleteMany(opts)`) and the _table_
  for Drizzle (`db.delete(users)`); reading it wrong either suppresses the headline
  Drizzle finding or invents a false positive on every dynamically built filter.

  **Not shipped for Sequelize or TypeORM.** Sequelize gives its instance and static
  forms the same names and both accept an options object, so
  `user.destroy({ transaction: t })` (one row) and `User.destroy({})` (the whole
  table) are the same AST. Two false positives surfaced in its test suite, and the
  rule was withdrawn from that package rather than shipped with them — a rule that
  fires on correct code is the one users disable. The genuinely detectable case,
  `destroy({ truncate: true })`, becomes its own rule. TypeORM's bare-criteria shape
  (`repo.delete({ id })`, with no `where` key) is a third detection shape and is
  deferred for the same reason.

  Scope that cannot be read statically is treated as present, so the rule stays
  silent rather than guessing. Ships in `strict` only — promotion to `recommended`
  and `flagship` waits on a measured false-positive profile against the benchmark
  corpus.

### Patch Changes

- Updated dependencies [[`e8e9ee6`](https://github.com/ofri-peretz/eslint/commit/e8e9ee6d521bac301d0554e54ec22afbe8f49e98)]:
  - @interlace/eslint-devkit@1.7.0

## 0.1.1

### Patch Changes

- [#338](https://github.com/ofri-peretz/eslint/pull/338) [`dc25c81`](https://github.com/ofri-peretz/eslint/commit/dc25c81ffda3c261c9f3d80a87931679cf8c059f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Re-publish every package so npm carries the optimised artifact

  No source changed. This is a no-op patch whose entire purpose is to ship the
  artifact the current build already produces.

  **Manifests.** `scripts` and `devDependencies` are now stripped from every
  published `package.json`. Neither can do anything in a consumer’s
  node_modules — npm never runs one and never installs the other — but they
  shipped in all 27 manifests, cluttered the npm page, and were read by SCA
  tools scanning installed manifests. No package declares a lifecycle hook, so
  nothing observable changes. Every published package is bumped so this applies
  uniformly rather than to a subset.

  **Tarballs.** 20 packages were last published before the build pipeline
  changed and still ship `AGENTS.md`, `CHANGELOG.md`, JSDoc in the emitted
  `.js`, and the full generated `.d.ts` tree:

  | package                            | published | rebuilt | saving  |
  | ---------------------------------- | --------- | ------- | ------- |
  | `eslint-plugin-react-features`     | 547 kB    | 320 kB  | −227 kB |
  | `eslint-plugin-secure-coding`      | 653 kB    | 477 kB  | −176 kB |
  | `eslint-plugin-conventions`        | 241 kB    | 116 kB  | −125 kB |
  | `eslint-plugin-browser-security`   | 380 kB    | 291 kB  | −89 kB  |
  | `eslint-plugin-maintainability`    | 178 kB    | 116 kB  | −62 kB  |
  | `eslint-plugin-react-a11y`         | 232 kB    | 173 kB  | −59 kB  |
  | `eslint-plugin-reliability`        | 148 kB    | 90 kB   | −58 kB  |
  | `eslint-plugin-vercel-ai-security` | 187 kB    | 130 kB  | −57 kB  |
  | `eslint-plugin-operability`        | 90 kB     | 43 kB   | −47 kB  |
  | `eslint-plugin-jwt`                | 140 kB    | 95 kB   | −45 kB  |
  | `eslint-plugin-modularity`         | 98 kB     | 58 kB   | −40 kB  |
  | `eslint-plugin-nestjs-security`    | 122 kB    | 86 kB   | −36 kB  |
  | `eslint-plugin-sqlite-security`    | 54 kB     | 20 kB   | −34 kB  |
  | `eslint-plugin-sequelize-security` | 54 kB     | 21 kB   | −34 kB  |
  | `eslint-plugin-prisma-security`    | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-mysql-security`     | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-typeorm-security`   | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-drizzle-security`   | 52 kB     | 19 kB   | −33 kB  |
  | `eslint-plugin-knex-security`      | 51 kB     | 19 kB   | −32 kB  |
  | `eslint-plugin-modernization`      | 45 kB     | 38 kB   | −7 kB   |

  Those 20 go from 3428 kB to 2169 kB — **−36.7%**. The remaining
  7 were released after the pipeline change and only gain the manifest strip.

  A new check in `scripts/check-published-artifacts.ts` fails the build if
  `scripts` or `devDependencies` ever reappear in a published manifest, so the
  strip cannot silently regress.

  The dependency ranges did **not** need updating: every plugin pins
  `@interlace/eslint-devkit` with a caret that 1.6.0 satisfies, verified by a
  clean install of an unchanged plugin resolving devkit 1.6.0 with zero
  dependencies and no `typescript` in the tree.

- Updated dependencies [[`dc25c81`](https://github.com/ofri-peretz/eslint/commit/dc25c81ffda3c261c9f3d80a87931679cf8c059f)]:
  - @interlace/eslint-devkit@1.6.1

## 0.1.0

### Minor Changes

Six new driver-scoped SQL-injection plugins (CWE-89), each shipping one rule —
`no-unsafe-query` at `error` in `recommended`:

- **`eslint-plugin-mysql-security`** — mysql2 / mysql. Sinks: `.query()`, `.execute()` (gated on SQL keywords in the static text, since these are common method names outside MySQL). Remediation names MySQL's own safe API.
- **`eslint-plugin-prisma-security`** — @prisma/client. Sinks: `.$queryRawUnsafe()`, `.$executeRawUnsafe()`. Remediation names Prisma's own safe API.
- **`eslint-plugin-drizzle-security`** — drizzle-orm. Sinks: `.raw()`. Remediation names Drizzle's own safe API.
- **`eslint-plugin-knex-security`** — knex. Sinks: `.raw()`. Remediation names Knex's own safe API.
- **`eslint-plugin-sqlite-security`** — better-sqlite3 / sqlite3. Sinks: `.prepare()`, `.exec()`, `.run()`, `.all()`, `.get()` (gated on SQL keywords in the static text, since these are common method names outside SQLite). Remediation names SQLite's own safe API.
- **`eslint-plugin-typeorm-security`** — typeorm. Sinks: `.query()`. Remediation names TypeORM's own safe API.

All six instantiate the shared `createSqlInjectionRule` from
`@interlace/eslint-devkit`, so detection is one implementation and each
plugin differs only in sinks, precision gate and remediation copy. Install the
one matching your stack and you get exactly one finding per line.

None are added to `eslint-config-interlace`'s aggregated presets: sink names
overlap across drivers (`.query()`, `.raw()`), so bundling them would report the
same line more than once.
