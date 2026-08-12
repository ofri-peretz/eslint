## [8.3.0] - 2026-02-08

## 9.0.0

### Major Changes

- [#491](https://github.com/ofri-peretz/eslint/pull/491) [`b52aafe`](https://github.com/ofri-peretz/eslint/commit/b52aafe557afd53d3f1ebe0683f90d2992ea4650) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Every rule now abstains in files without local MongoDB evidence

  Measured over the corpus, **47% of everything this plugin reported (1,663 of
  3,542 findings) was in a file with no Mongo import**. The plugin already
  discriminated by _receiver_ (`receiver.ts`), but that is a name heuristic:
  `userModel.findOne()` reads identically in a TypeORM repository and a Mongoose
  one. Grouping the off-SDK findings by repository, **73% sat in repositories with
  zero MongoDB anywhere** — twentyhq, strapi and cal.com are TypeORM and Prisma.
  The file-level question is the one the plugin could not ask.

  **This gate is a union, unlike vercel-ai's, and the corpus is why.** An
  import-only probe was right for the AI SDK because every no-import caller turned
  out to be a different vendor. Here the opposite risk dominates: the idiomatic
  Mongoose layout defines a model in one file and consumes it through a
  **relative** import, so a service calling `User.findOne()` has no package
  specifier to find.

  Evidence accepted, each chosen by measurement:

  - an import / `require` / dynamic `import()` / **`import x = require(...)`** of
    `mongodb`, `mongoose`, `@nestjs/mongoose`, `@typegoose/typegoose`, `bson`,
    `connect-mongo`, **or any `mongoose-*` / `*-mongoose` plugin**. The plugin
    ecosystem matters: of the twelve corpus files containing `new Schema(` that a
    four-package list placed "outside Mongo", **eleven were plugin consumers** —
    `mongoose-paginate`, `passport-local-mongoose`, `mongoose-lean-virtuals`.
  - `new Schema(...)` / `new mongoose.Schema(...)`
  - `.lean()` — Mongoose's own query modifier, with no analogue elsewhere
  - `Types.ObjectId` and `new ObjectId(...)`
  - a `mongodb://` or `mongodb+srv://` connection string, anywhere in a literal or
    template quasi

  Two obvious candidates were **rejected on evidence**:

  - `$set` / `$push` / `$inc` object keys look Mongo-specific and are not. `$push`
    is `react-addons-update`'s immutability helper, `$set` is jQuery UI, and
    `$addToSet` is Meteor's minimongo — all three appear in the corpus.
  - a **bare** `ObjectId` identifier is a type name in unrelated libraries, so only
    the qualified and constructed forms count.

  A locally bound `require` is not module loading, and shadowing is **lexical**
  from the start — the file-wide flag that regressed express/postgres in [#483](https://github.com/ofri-peretz/eslint/issues/483) is
  not repeated. The probe is cached per `Program`, so sixteen rules cost one AST
  walk.

  **Recall cost measured, not assumed.** Every finding over all 232 corpus files
  carrying Mongo evidence, diffed before and after: **316 → 316**. The first run of
  that diff lost six findings and **caught two real defects in this gate**, both
  now fixed and locked: `import x = require('mongoose')` is a
  `TSImportEqualsDeclaration` rather than a `require` call and was invisible (three
  files, and DefinitelyTyped writes nearly every CommonJS test this way), and the
  DSN test was anchored to the start of the string so
  `'MONGODB_URL=mongodb://…'` did not count (two files).

  The single remaining difference is `express-rest-boilerplate/src/index.js`,
  where `mongoose` is a **relative** import of a local wrapper. The dropped report
  was `require-auth-mechanism` on `mongoose.connect()` — a zero-argument call that
  merely delegates. The genuine finding for that same defect is retained at the
  real connect site, `src/config/mongoose.js:26`, where
  `mongoose.connect(mongo.uri, {...})` specifies no auth mechanism. **Zero
  actionable findings lost.**

  That relative-wrapper shape is the gate's known false negative and it is
  deliberate: resolving one hop across files would give every rule project state
  that can go stale and a dependency on lint order, which no other probe in this
  ecosystem has.

  Locked by `src/module-gate.lock.test.ts` over the whole rule registry, with the
  TypeORM / Prisma / `react-addons-update` / jQuery shapes as negatives and ten
  positive controls — including the import-equals and unanchored-DSN cases the
  recall diff uncovered — so the suite cannot pass with the gate shut.

### Patch Changes

- [#492](https://github.com/ofri-peretz/eslint/pull/492) [`2c0afb7`](https://github.com/ofri-peretz/eslint/commit/2c0afb7e273837c959f00c8c005628e2ba0e00fd) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Close the relative-wrapper false negative in the MongoDB evidence gate

  The gate shipped in [#491](https://github.com/ofri-peretz/eslint/issues/491) documented one false negative and accepted it: a file
  that binds `mongoose` from a **relative** wrapper —
  `const mongoose = require('./config/mongoose')` — carries no package specifier,
  so every rule abstained. Accepting that was the wrong call. A security rule that
  silently stops reporting is precisely the failure this ecosystem exists to
  prevent, and "documented" does not make a false negative safe.

  The fix is a binding-name arm: an identifier bound as `mongoose` or `Mongoose`,
  whatever it was assigned from. The name is safe evidence in a way `db`,
  `collection` and `model` are not — those are generic English, `mongoose` is a
  product name. Measured over the corpus: **58 files bind that identifier, 57
  already import a Mongo package, and the 58th is exactly the missed file.** The
  arm opens the gate on one additional file and introduces no other.

  It is the _binding name_ that counts, not the specifier, so
  `import db from './mongoose'` still does not qualify — a module path that merely
  ends in `/mongoose` is not evidence about what the file does.

  **Recall re-diffed over all 232 corpus files carrying Mongo evidence: 316 → 316
  against the pre-gate baseline — zero findings lost**, versus 315 with [#491](https://github.com/ofri-peretz/eslint/issues/491) as
  shipped. The recovered finding is `require-auth-mechanism` at
  `express-rest-boilerplate/src/index.js:9`.

  The lock's "a local module merely named mongoose" negative was the same shape as
  the false negative, so it has been **flipped into a positive control** and
  replaced with a sharper negative (a relative import whose local name is _not_
  `mongoose`).

  Two further gaps surfaced while restoring the coverage floor, both now locked:

  - `isMongoDynamicLoad` was a nested ternary; it is now early returns, so the
    shadowed-`require` case is its own targeted line rather than a short-circuit
    buried mid-expression.
  - with the name arm added, `const mongoose = require('mongoose')` is matched by
    the **name** first and the walk stops, so the require-specifier path is only
    reachable through a differently-named binding. That case
    (`const db = require('mongoose')`) had no test and now does.

- Updated dependencies [[`574b1ae`](https://github.com/ofri-peretz/eslint/commit/574b1aef52bdf06f0e48b3d86e9c67206a5a6617)]:
  - @interlace/eslint-devkit@1.12.0

## 8.4.0

### Minor Changes

- [#309](https://github.com/ofri-peretz/eslint/pull/309) [`237a6b0`](https://github.com/ofri-peretz/eslint/commit/237a6b03313e2ea935999ee84b2a6c8af33e50bc) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `meta.hasSuggestions` now matches what each rule actually emits.

  ILB-Remediation measured 27 rules where the declaration and the implementation
  disagreed: 22 declared `hasSuggestions: true` without ever passing `suggest:`
  to `context.report()` (IDE quick-fix menus advertising remediation that never
  arrives), and 5 emitted `suggest:` without the declaration (latent — ESLint
  throws on that combination as soon as one of those suggestions carries a real
  fixer).

  `eslint-plugin-mongodb-security` gains four real suggestions where the rewrite
  is mechanical:

  - `require-lean-queries` — appends `.lean()`
  - `no-unbounded-find` — appends `.limit(100)`
  - `no-debug-mode-production` — rewrites the flag to `process.env.NODE_ENV !== 'production'`
  - `require-tls-connection` — adds (or flips) `tls: true` in the connection options

  Every other dead declaration was removed rather than faked. A workspace lock
  (`scripts/__tests__/suggestions-meta-lock.test.ts`) now fails CI on either
  direction of the drift.

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

- [#329](https://github.com/ofri-peretz/eslint/pull/329) [`75d3497`](https://github.com/ofri-peretz/eslint/commit/75d349787f8ec081ae961cc4984ea4973c8be730) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Test infrastructure only — no rule, config, or API behavior changes. These
  packages ship `src/` in their npm tarball, so the moved SDK compatibility specs
  technically alter the published files, hence the patch bump.

  The `src/__compatibility__/` suites no longer run as part of each package's
  default `vitest` run. They assert the export surface of the third-party SDK
  (express, jose, @middy/core, mongodb, @nestjs/common, pg, ai), not our rules, and
  `sdk-compatibility.yml` already exercises them against each SDK's `@latest` —
  the only run that produces new signal. Loading those SDK graphs on a cold module
  cache was measured at 82s (express) and 209s (`@nestjs/common`), which blew every
  per-file hook timeout and blocked unrelated local commits via the lefthook
  `tests-affected` pre-commit hook. The ceiling now lives once in
  `vitest.compat.config.mts`, sized off those cold numbers.

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

## 8.3.5

### Patch Changes

- [#415](https://github.com/ofri-peretz/eslint/pull/415) [`bdca95c`](https://github.com/ofri-peretz/eslint/commit/bdca95c195ae366eea3d370b261f56af8314c6f1) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `require-projection` and `require-lean-queries` no longer report
  `Array.prototype.find`.

  Both rules keyed off the method name alone — any `X.find(...)`, `X.findOne(...)`
  or `X.findById(...)` — with no check that the receiver was a MongoDB handle. A
  plain `[1, 2, 3].find((x) => x === 2)` in a file containing no MongoDB reported
  CWE-200. Both rules are in `recommended`, so every consumer got an error on
  every `Array.prototype.find` in their codebase.

  Measured by running the whole published ruleset over the Interlace monorepo,
  which uses no MongoDB: **115 findings each, all false positives**, including one
  on a React component doing `pluginStats.plugins.find((p) => p.name === …)`.

  The plugin already had the fix: `analyzeMongoScope().isModelReceiver()` exists
  precisely because "method names alone are hopeless discriminators", and five
  sibling rules use it. These two never adopted it. They now do, ordered after the
  cheap syntax checks so the receiver analysis only runs on a candidate call.

  Locked with the array cases as `valid` in both rules — verified by reverting the
  gate and watching them report again.

  True positives are unaffected: `db.collection('users').find({})` and
  `User.find({ active: true })` still report.

## 8.3.4

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

## 8.3.3

### Patch Changes

- [#383](https://github.com/ofri-peretz/eslint/pull/383) [`868c4a8`](https://github.com/ofri-peretz/eslint/commit/868c4a857e26b632741374e34401e55246daf01e) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Document every rule option, and add `description` to the schemas that had none

  282 working options across 123 rules had no row in their rule's Options table,
  and 62 rule docs had no Options section at all. An option nobody can find is,
  in practice, an option that does not exist — the only difference from a dead
  one is that the code is there.

  Schema descriptions are now the source of truth, so editors and any tooling
  that reads `meta.schema` get them too, not just the docs site. 75 options that
  had no description anywhere got one written from their own default value and
  the rule's stated purpose.

  Rule behaviour is unchanged. This is documentation plus schema `description`
  metadata; no detection, option name, or default was touched.

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

## 8.3.2

### Patch Changes

- [#364](https://github.com/ofri-peretz/eslint/pull/364) [`86baa02`](https://github.com/ofri-peretz/eslint/commit/86baa026485bf93d63f1523d6eb382e0a40cbb3f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the ecosystem and oxlint marks to the README logo row. Each plugin now
  leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
  postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
  vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
  without an ecosystem mark. README-only change - no rule behaviour is affected.
  The patch bump is what carries the new README onto npm, which only refreshes a
  package README on publish.

## 8.3.1

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

## 8.3.0

### Minor Changes

- [#328](https://github.com/ofri-peretz/eslint/pull/328) [`0231140`](https://github.com/ofri-peretz/eslint/commit/023114046b2844d3daab88f40293bddd75519fe3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Eliminate the false-positive storm on real MongoDB/Mongoose codebases.

  A dry run against mikemajesty/nestjs-microservice-boilerplate-api (393★,
  NestJS 11 + Mongoose, 253 files) produced 145 findings under `recommended`,
  138 of which were false positives. Method names alone were doing all the work:
  `find` is also `Array.prototype.find`, `connect` is also a Redis client and a
  TypeORM query runner, and `findOne`/`updateOne` are the vocabulary of every
  generic repository wrapper ever written.

  | Rule                         | Before  | After  |
  | ---------------------------- | ------- | ------ |
  | `no-select-sensitive-fields` | 80      | 0      |
  | `no-unbounded-find`          | 41      | 8      |
  | `no-bypass-middleware`       | 11      | 6      |
  | `require-auth-mechanism`     | 7       | 0      |
  | `require-tls-connection`     | 2       | 0      |
  | **total**                    | **145** | **18** |

  The remaining 18 are all real Mongoose model calls in one repository file.

  New shared `utils/receiver.ts` answers, once per file, whether a call's
  _receiver_ is plausibly MongoDB — a PascalCase model identifier, a
  `model`/`collection`/`db` name, a `db.collection(...)` chain, or a value bound
  to a `mongodb`/`mongoose` import. Connection rules are stricter still:
  `client`/`connection` earn no benefit of the doubt, since they are just as
  likely Redis or Postgres.

  `no-select-sensitive-fields` additionally requires evidence that a sensitive
  field exists before claiming one is exposed — either the query names it
  (`.select('password')`, `{ projection: { password: 1 } }`) or a sensitive
  field name is visible in the file. The new `requireVisibleSensitiveField`
  option (default `true`) restores the old behaviour for codebases whose schemas
  live outside the files that query them.

  `allowInTests` now recognises `test/`, `tests/`, `__tests__/`, `__mocks__/`,
  `e2e/` and `fixtures/` directories, not only a `*.test.ts` suffix — a
  testcontainers helper is not a production connection.

  Every fix ships a regression fixture taken from the real scan alongside a
  true-positive test, so no rule goes inert.

### Patch Changes

- Updated dependencies [[`a5fad9f`](https://github.com/ofri-peretz/eslint/commit/a5fad9f97a5ef5a64c091d5174fec74fbe1e96c3), [`0231140`](https://github.com/ofri-peretz/eslint/commit/023114046b2844d3daab88f40293bddd75519fe3), [`4cc62d6`](https://github.com/ofri-peretz/eslint/commit/4cc62d63908f91a7c54addadf21678c46c2bcc19)]:
  - @interlace/eslint-devkit@1.6.0

## 8.2.8

### Patch Changes

- [#294](https://github.com/ofri-peretz/eslint/pull/294) [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rewrite `description` and `keywords` on every published package for npm search discovery. npm ranks on name, description, and keywords, and the registry only picks up these fields at publish — so this is metadata-only and takes effect for each package on its next release.

  **Descriptions now lead with the search phrase.** Every one starts `ESLint plugin for <the thing you'd search>` instead of a brand-first or category-first framing, and names the concrete vulnerabilities the plugin actually detects. Three were corrected while doing so:

  - `eslint-plugin-import-next` claimed "100x faster no-cycle detection". No 100x measurement exists: `CLAIMS.md` records **3.1x end-to-end** (8x in pure rule execution) on a 5,483-file React codebase, and the highest number in any benchmark result is 54.9x on the synthetic corpus. The description now states the real-codebase figure.
  - `eslint-plugin-secure-coding` claimed SQL injection, XSS and CSRF coverage — none of which are its rules. It now names what it does detect: LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs.
  - `eslint-plugin-secure-coding` ("89 rules") and `eslint-plugin-react-a11y` ("37 rules") hard-coded rule counts that had drifted from reality. Counts are generated into `interlace-numbers.json`; hand-typed copies are removed rather than corrected.

  **Keywords now match the vocabulary of the plugins that rank.** `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-n` and `eslint-plugin-import` all carry the `eslint` / `eslintplugin` / `eslint-plugin` trio — six of our packages were missing `eslintplugin`, and every one now carries all three plus `static-analysis`, `linting` and `code-quality`. Security plugins add `sast`, `appsec` and `vulnerability`; `node-security` and `secure-coding` also carry `nodesecurity`, the exact keyword `eslint-plugin-security` ranks on. Each plugin gained the CWE identifiers and attack names for what it detects (`cwe-78` command injection, `cwe-22` path traversal, `cwe-89` SQL injection, `cwe-79` XSS, `cwe-347` JWT algorithm confusion, `cwe-352` CSRF, `cwe-943` NoSQL injection), and `node-security` gained the crypto vocabulary it had been missing entirely despite absorbing the crypto rule set (`crypto`, `cryptography`, `weak-hash`, `md5`, `sha1`, `timing-attack`).

  No rule behavior, exports, or configuration changes.

- Updated dependencies [[`e1cdf83`](https://github.com/ofri-peretz/eslint/commit/e1cdf83e3db761907f0ab06f7fc6c1f1da7513a5), [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358)]:
  - @interlace/eslint-devkit@1.4.3

## 8.2.7

### Patch Changes

- [#274](https://github.com/ofri-peretz/eslint/pull/274) [`acdd2ad`](https://github.com/ofri-peretz/eslint/commit/acdd2ad257c2d7b6559476d05f6cc9de48da14b5) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Widen optional peer ranges to accept mongoose ^9 and mongodb driver ^7. The rules lint call patterns statically and never import either library, and the interface-compatibility suite passes against mongoose 9.7 / mongodb 7.5 — the old caps just broke `npm install` in current-major repos.

## 8.2.6

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 8.2.5

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 8.2.4

### Patch Changes

- [#143](https://github.com/ofri-peretz/eslint/pull/143) [`213cde1`](https://github.com/ofri-peretz/eslint/commit/213cde190ff2aea49ca7c1b533170940f879d9b4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(no-missing-null-checks): eliminate 53 false positives via three new narrowing patterns

  Rules that were recognized as null guards are now correctly identified as safe:
  1. **Truthy if guard** — `if (obj) { obj.prop }` — direct truthy check proves non-null. Also covers chains: `if (response)` protects `response.data.items`.
  2. **Short-circuit AND** — `obj && obj.prop` — right side of `&&` only runs when left is truthy.
  3. **Ternary consequent** — `obj ? obj.prop : fallback` — truthy test guards the consequent.

  Also: bumped `beforeAll` timeout to 30 seconds in 7 compatibility test files (`__compatibility__/*.spec.ts`). Native-addon packages routinely exceed the previous 10-second default on a cold ESM load.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Added

- **no-hardcoded-connection-string**: Detect hardcoded `mongodb://` and `mongodb+srv://` URIs in string and template literals (CWE-798, CVSS 7.5)
- **no-hardcoded-credentials**: Flag `user`, `username`, `pass`, `password`, `auth` properties with literal string values (CWE-798, CVSS 7.5)
- **no-debug-mode-production**: Detect `mongoose.set('debug', true)` calls exposing query details (CWE-489, CVSS 3.1)
- **no-unsafe-where**: Detect `$where` operator in object literals and `.where('$where')` method calls — RCE vector (CWE-943, CVSS 9.0)
- **no-operator-injection**: Flag dangerous MongoDB operators (`$ne`, `$gt`, `$lt`, etc.) when values reference user input (CWE-943, CVSS 9.1)
- **no-unbounded-find**: Require `.limit()` on `find()`/`findOne()` queries to prevent resource exhaustion (CWE-400, CVSS 4.3)
- **require-tls-connection**: Require `tls: true` or `ssl: true` in `connect()`/`createConnection()` options (CWE-295, CVSS 7.4)
- **no-bypass-middleware**: Flag Mongoose methods that bypass pre/post middleware hooks (`updateOne`, `deleteMany`, `insertMany`, `bulkWrite`, etc.) (CWE-284, CVSS 5.3)
- Comprehensive test suites for all 8 rules (163 total tests)
- Test coverage improved from 72.61% to 91.30% lines

## [8.2.3] - 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [8.2.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [8.2.1] - 2026-02-02

This was a version bump only for eslint-plugin-mongodb-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-mongodb-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-09

### Added

- Initial release with 16 security rules
- **NoSQL Injection Prevention** (4 rules)
  - `no-unsafe-query` - Prevents string concatenation in MongoDB queries
  - `no-operator-injection` - Prevents $ne, $gt, $lt injection attacks
  - `no-unsafe-where` - Prevents $where operator RCE (CVE-2025-23061, CVE-2024-53900)
  - `no-unsafe-regex-query` - Prevents ReDoS via $regex
- **Credentials & Connection Security** (4 rules)
  - `no-hardcoded-connection-string` - Prevents credentials in connection URIs
  - `no-hardcoded-credentials` - Prevents hardcoded auth options
  - `require-tls-connection` - Requires TLS for production connections
  - `require-auth-mechanism` - Requires explicit SCRAM-SHA-256
- **Mongoose ODM Security** (5 rules)
  - `require-schema-validation` - Requires Mongoose schema validators
  - `no-select-sensitive-fields` - Prevents returning password/token fields
  - `no-bypass-middleware` - Prevents bypassing pre/post hooks
  - `no-unsafe-populate` - Prevents user-controlled populate()
  - `require-lean-queries` - Suggests .lean() for read-only queries
- **Best Practices** (3 rules)
  - `no-unbounded-find` - Requires limit() on find queries
  - `require-projection` - Requires field projection
  - `no-debug-mode-production` - Prevents debug mode in production
- Full support for `mongodb`, `mongoose`, `mongodb-client-encryption`, `@typegoose/typegoose`
- AI-optimized error messages with CWE and OWASP references
- Three configuration presets: `recommended`, `strict`, `mongoose`
- OWASP Top 10 2021 mapping (A01-A07 coverage)
