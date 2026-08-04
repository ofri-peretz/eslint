## [1.4.0] - 2026-05-03

## 1.7.0

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

## 1.6.2

### Patch Changes

- [#341](https://github.com/ofri-peretz/eslint/pull/341) [`a8f5e13`](https://github.com/ofri-peretz/eslint/commit/a8f5e13f3e0ae01ff99d6ca0882dfc624e305d9d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix "Cannot find module '@typescript-eslint/utils'" on a clean install — every
  published plugin was failing to load.

  `rule-creation/sql-injection-rule.ts` imported `AST_NODE_TYPES` from
  `@typescript-eslint/utils`. That is an **enum — a runtime value**, so the built
  output emitted `require("@typescript-eslint/utils")`. But the devkit declares
  that package as an `optional` peer dependency, which npm does not install. The
  result: any project doing `npm i -D eslint-plugin-<any>` got a package that threw
  on `require`.

  Reproduced from nothing:

  ```
  npm i -D eslint eslint-plugin-mongodb-security
  node -e "require('eslint-plugin-mongodb-security')"
  → Error: Cannot find module '@typescript-eslint/utils'
  ```

  Verified on `nestjs-security`, `secure-coding`, `node-security` and `jwt` too —
  **all four failed identically**, so this affected the whole published ecosystem.

  The fix keeps the zero-dependency goal intact: `AST_NODE_TYPES` now comes from the
  local `../ast-node-types` shim that exists for exactly this reason, and
  `TSESLint` / `TSESTree` become `import type`, which is erased at compile time.
  No dependency added, no artifact-size regression.

  A lock test asserts the built output contains no runtime `require` of
  `@typescript-eslint/utils`, so this cannot regress silently again.

## 1.6.1

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

## 1.6.0

### Minor Changes

- [#334](https://github.com/ofri-peretz/eslint/pull/334) [`a5fad9f`](https://github.com/ofri-peretz/eslint/commit/a5fad9f97a5ef5a64c091d5174fec74fbe1e96c3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Zero runtime dependencies: install 7500 kB → 444 kB, load 242 ms → 13.6 ms

  `@interlace/eslint-devkit` is the infrastructure package every plugin in this
  ecosystem depends on, so its dependency tree was every plugin's dependency
  tree — 2 dependencies pulling 22 packages, 5.42 MB as reported by
  packagephobia, and 433 modules evaluated on every `require`.

  It now declares **no dependencies at all**. A bare install is one package;
  the tarball is 65.9 kB packed; a cold `require` of the barrel loads 29
  modules in 13.6 ms instead of 433 in 242 ms — roughly a quarter-second off
  every ESLint process start, per plugin.

  End to end, on the same fixture and min-of-10 warm: **ESLint 288 → 216 ms
  (−25%)** and **oxlint 320 → 145 ms (−55%)**. oxlint benefits because it loads
  these plugins through the JS-plugin shims in `tools/oxlint-plugins/`; against
  its 68 ms pure-Rust floor, the JS-plugin overhead fell **252 → 77 ms (−69%)**.

  The compiled output only ever made five external `require()` calls. Four were
  avoidable:

  - **`typescript` (24 MB)** — imported only for `ts.TypeFlags` bitflag
    constants in `type-utils.ts`. Those values are now inlined, and `typescript`
    is an optional peer. `src/types/type-flags.test.ts` asserts the inlined
    table against the real compiler so it cannot silently drift.
  - **`@typescript-eslint/utils` (~4.5 MB with its tree)** — used at runtime
    only for `ESLintUtils.RuleCreator` and `AST_NODE_TYPES`. `RuleCreator` is
    ported in-tree with its full generic signature;
    `src/rule-creation/rule-creator.parity.test.ts` diffs the port against
    upstream on every run. Crucially, `utils` declares a _non-optional_
    `typescript` peer — dropping it as a hard dependency is what actually
    releases the 24 MB above.
  - **`@typescript-eslint/types` (144 KB)** — 168 self-mapped strings behind a
    144 KB package. `AST_NODE_TYPES` is now inlined in `src/ast-node-types.ts`
    (12 KB), cast to the upstream enum type so the _exported type is unchanged_:
    a plain `as const` object would break consumers, because TypeScript rejects
    a string literal where a string-enum member is expected.
    `src/ast-node-types.test.ts` compares the table to the real enum in both
    directions, so an upstream addition or rename fails the build instead of
    silently shipping a node type our rules can never match.
  - **`oxc-resolver` (~1.5 MB native binary)** — exactly one plugin
    (`eslint-plugin-import-next`) resolves imports, but all 21 consumers
    downloaded the binary. It is now an optional peer, loaded lazily on first
    use rather than at module load; `eslint-plugin-import-next` declares it
    directly. A missing binary raises `MissingResolverPeerError` with install
    instructions rather than being swallowed into "this import doesn't resolve".

  Type-only imports from `@typescript-eslint/utils` remain and cost nothing at
  runtime, so the public type surface is unchanged. No exported symbol was
  removed or retyped; `turbo build` across all 22 workspace packages, 43/43 test
  tasks, and the oxlint-parity benchmark (100%) all pass unchanged, and a
  packed plugin lints correctly in a project with no `@typescript-eslint`
  scope, no `typescript`, and no `oxc-resolver` installed.

  Two further reductions were measured and rejected as bad trades: lazy-loading
  the resolver and ARIA subtrees (~8 ms of the 13.6 ms load, but it moves cost
  onto `eslint-plugin-import-next`'s per-import hot path), and dropping `tslib`
  via `importHelpers: false` (+8 KB of emitted JS to shed a peer every plugin
  declares anyway).

  **Every package also stops shipping dead bytes** — 1.5 MB across the
  ecosystem, 5539.4 kB → 3546 kB unpacked (−36.0%), with no consumer-visible
  change. `scripts/build-package.ts` owns all five exclusions:

  - **Source maps** (322 kB, 93 files). `tsconfig.base.json` sets
    `sourceMap: true` and only eslint-devkit opted out. Every published map was
    dead on arrival: `.npmignore` strips `*.ts`, so each pointed at a source
    file absent from the tarball. They are now deleted outright rather than
    filtered at pack time — a map is only useful beside the source it maps to,
    and the comment-strip pass below rewrites the `.js` anyway, so a retained
    map would be stale as well as unpublishable.
  - **`AGENTS.md`** (48 kB, 12 packages). Contributor docs — "context for AI
    coding agents _working on_ \<pkg\>", with monorepo-root install steps and
    `nx` commands this repo no longer uses.
  - **JSDoc in emitted `.js`** (571 kB, 17% of all shipped JavaScript). Nobody
    reads comments in `node_modules/**/dist/*.js`; the `.d.ts` comments, which
    editors _do_ surface on hover, are untouched. `removeComments` can't just be
    switched on — it strips `.d.ts` docs too (devkit's declarations drop
    98 kB → 31 kB and every hover doc vanishes), and a second in-place pass is
    rejected on composite projects and clobbers the good `.d.ts`. So the build
    re-emits to a scratch dir and copies back only the `.js`. Same compiler,
    same input, output identical apart from comments. Costs ~1.5 s per package
    on a cold build (turbo caches it) and does **not** change load time — V8
    skips comments cheaply (measured 16.15 → 16.01 ms); this is a size win only. Per-file MIT headers go
    with the comments; `LICENSE` still ships at every package root.

  - **Generated declarations for the plugins** (595 kB). A plugin is consumed by
    ESLint at runtime, not imported as a typed library, but tsc still inlined
    every inferred rule-option type into the entry declaration —
    `eslint-plugin-import-next` shipped a 166 kB `index.d.ts`. They can't just
    be deleted: a TypeScript flat config does
    `import plugin from 'eslint-plugin-foo'`, which is TS7016 with no
    declaration (verified). So the entry declarations are replaced by a ~350-byte
    hand-written one typing the plugin object shape — all a config file touches.
    `src/types/**` is preserved verbatim, because 14 plugins expose it as a
    public `./types` subpath that consumers really do import. Only
    `eslint-plugin-*` is pruned; `@interlace/eslint-devkit` is a real library
    whose declarations are the product.

  - **`CHANGELOG.md`** (225 kB, 6% of everything shipped). The one component
    that grows with every release forever, so its share only rises. npm does not
    render it on the package page — the history stays on GitHub, in npm's
    "Versions" tab, and in the changesets release notes. `README.md` is kept: it
    IS the npm package page.

  `scripts/check-published-artifacts.ts` (new, wired into `pre-push`,
  `npm run quality`, and the release workflow's pre-publish stage) fails the
  build if any of these comes back, and also locks the discoverability metadata
  npm search and quality scorers read. It runs on the exact artifact the release
  job publishes — locally, any `tsc --build` over the solution (e.g.
  `npm run typecheck`) re-emits into `dist/` and undoes the post-processing; a
  rebuild restores it, and the gate catches it either way.

  `scripts/check-artifact-size.ts` (new) reports per-package size against a
  committed baseline (`.agent/artifact-size-baseline.json`). It is **advisory —
  it never blocks**, because bundles legitimately grow and a hard cap would just
  get raised until it meant nothing. The point is that growth becomes a noticed
  decision rather than a surprise found later on npm. `--update` refreshes the
  baseline; `--strict` exits non-zero for a deliberate audit.

  Every before/after pair above was measured on the SAME codebase — `origin/main`
  at 8172db04 built in one worktree, this branch in another — min-of-10 warm runs
  on Node 24. Earlier figures in this changeset came from a stale branch and were
  restated on 2026-08-03.

  **Migration.** With npm 7+ these are auto-installed as peers where a real
  dependency exists, so most consumers need no change. If you use a strict
  package manager (pnpm without hoisting, or `--legacy-peer-deps`) and hit a
  missing module, install it explicitly:

  - type-aware rules → `typescript`
  - `eslint-plugin-import-next` → `oxc-resolver` (now declared for you)

  Marked `minor`, not `major`. The API is unchanged — no exported symbol was
  removed or retyped — and with npm 7+ the three ex-dependencies are auto-installed
  as peers wherever a real dependency exists. The honest caveat: a strict package
  manager (pnpm without hoisting, or `--legacy-peer-deps`) will now need them
  declared explicitly, which is the one respect in which this is a bigger change
  than the version implies. Dependents pin `^1.4.4`, which already satisfies
  1.5.0, so consumers pick up the slim infrastructure on their next install
  without a range rewrite.

### Patch Changes

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

- [#320](https://github.com/ofri-peretz/eslint/pull/320) [`4cc62d6`](https://github.com/ofri-peretz/eslint/commit/4cc62d63908f91a7c54addadf21678c46c2bcc19) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - **`no-cycle` no longer crashes on deep import chains.** Tarjan's SCC pass recursed once per graph node, so a chain deeper than the JS call stack threw `RangeError: Maximum call stack size exceeded` — and since the rule defaults to unlimited traversal depth, nothing capped the descent. ESLint exited 2 with no results at all: not a slow lint, no lint. Observed at file 4,974 of a 5,000-node chain on Node 24.

  The traversal now runs on an explicit frame stack. Traversal order and every write to the Tarjan state are unchanged, so the components produced are identical; depth is bounded by heap rather than by the call stack. `eslint-plugin-import` has the same defect in its own `lib/scc.js` and still crashes on the same input.

  Chains reach these depths through generated API clients, nested barrel files, and long `export … from` ladders — depth accumulates through re-export edges, which is exactly what the rule follows. Reproduce with `node benchmarks/scripts/repro-deep-chain.mjs 6000`.

## 1.5.0

### Minor Changes

Extract the raw-SQL-injection detector (CWE-89) into
`@interlace/eslint-devkit` as `createSqlInjectionRule`, so every driver plugin
can instantiate it with its own sinks and remediation copy.

Background: scanning OWASP Juice Shop with the recommended presets of
`secure-coding`, `node-security`, `express-security` and `mongodb-security`
produced zero findings on its two flagship SQL injections
(`routes/search.ts`, `routes/login.ts` — both `sequelize.query()` template
literals). The detection was never the problem: `pg/no-unsafe-query` matches
any `.query()` member call and flags both correctly. The problem is
distribution — nobody on Sequelize installs the Postgres plugin.

The factory takes the sink list, a SQL-keyword precision gate, and the
remediation copy, which is everything that actually differs between drivers.
`pg/no-unsafe-query` is now an instantiation of it: same rule id, message
ids, sink and behaviour, and all 28 pre-existing rule tests pass untouched.

Also raises the timeout on the `no-deprecated-plugin-references` guard in
devkit. Both layers shell out to a repo-wide `grep`, which cannot finish
inside vitest's 5s default once the suite has enough test files running in
parallel — it failed as a timeout, not a violation.

Driver-scoped plugins that instantiate the factory ship separately.

## 1.4.4

### Patch Changes

- [#302](https://github.com/ofri-peretz/eslint/pull/302) [`09d2951`](https://github.com/ofri-peretz/eslint/commit/09d2951b3ac74efc9ba49b64e9089d66800b16cc) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the Interlace OG banner to the README, so the npm page matches every
  published plugin in the ecosystem. devkit was the only published package
  carrying the closing Interlace mark but no banner. README-only change — no
  runtime, API, or type surface is affected; the release exists to get the
  updated README onto npm, where it is baked in at publish time.

## 1.4.3

### Patch Changes

- [#304](https://github.com/ofri-peretz/eslint/pull/304) [`e1cdf83`](https://github.com/ofri-peretz/eslint/commit/e1cdf83e3db761907f0ab06f7fc6c1f1da7513a5) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - README: call the plugin family "the Interlace eslint-plugins" instead of
  `@interlace/eslint-plugin-*`.

  The plugins publish unscoped — `eslint-plugin-jwt`, not
  `@interlace/eslint-plugin-jwt` — so the scoped form named packages that do not
  exist on npm. This is a docs-only change; no runtime behaviour is affected. It
  ships as a patch so the corrected text reaches the package page on npm.

- [#294](https://github.com/ofri-peretz/eslint/pull/294) [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rewrite `description` and `keywords` on every published package for npm search discovery. npm ranks on name, description, and keywords, and the registry only picks up these fields at publish — so this is metadata-only and takes effect for each package on its next release.

  **Descriptions now lead with the search phrase.** Every one starts `ESLint plugin for <the thing you'd search>` instead of a brand-first or category-first framing, and names the concrete vulnerabilities the plugin actually detects. Three were corrected while doing so:

  - `eslint-plugin-import-next` claimed "100x faster no-cycle detection". No 100x measurement exists: `CLAIMS.md` records **3.1x end-to-end** (8x in pure rule execution) on a 5,483-file React codebase, and the highest number in any benchmark result is 54.9x on the synthetic corpus. The description now states the real-codebase figure.
  - `eslint-plugin-secure-coding` claimed SQL injection, XSS and CSRF coverage — none of which are its rules. It now names what it does detect: LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs.
  - `eslint-plugin-secure-coding` ("89 rules") and `eslint-plugin-react-a11y` ("37 rules") hard-coded rule counts that had drifted from reality. Counts are generated into `interlace-numbers.json`; hand-typed copies are removed rather than corrected.

  **Keywords now match the vocabulary of the plugins that rank.** `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-n` and `eslint-plugin-import` all carry the `eslint` / `eslintplugin` / `eslint-plugin` trio — six of our packages were missing `eslintplugin`, and every one now carries all three plus `static-analysis`, `linting` and `code-quality`. Security plugins add `sast`, `appsec` and `vulnerability`; `node-security` and `secure-coding` also carry `nodesecurity`, the exact keyword `eslint-plugin-security` ranks on. Each plugin gained the CWE identifiers and attack names for what it detects (`cwe-78` command injection, `cwe-22` path traversal, `cwe-89` SQL injection, `cwe-79` XSS, `cwe-347` JWT algorithm confusion, `cwe-352` CSRF, `cwe-943` NoSQL injection), and `node-security` gained the crypto vocabulary it had been missing entirely despite absorbing the crypto rule set (`crypto`, `cryptography`, `weak-hash`, `md5`, `sha1`, `timing-attack`).

  No rule behavior, exports, or configuration changes.

## 1.4.2

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

## 1.4.1

### Patch Changes

- [#155](https://github.com/ofri-peretz/eslint/pull/155) [`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix `patternToRegex` (glob→regex) to escape **all** regex metacharacters, not just `.`. The previous chained `.replace()` left `\ + ( ) | [ ] { } ^ $` to leak through as regex syntax, so an ignore glob such as `a+b` or `(x)` compiled to a quantifier / capture group and matched the wrong files (CWE-116, surfaced by CodeQL `js/incomplete-sanitization`). The wildcard translation (`**`, `*`, `?`) is unchanged; a regression-lock test pins the metacharacter behavior.

### Changed

- Module resolver swapped from `enhanced-resolve` + `get-tsconfig` to [`oxc-resolver`](https://www.npmjs.com/package/oxc-resolver) (Rust NAPI, ~18-30× faster). Per-tsconfig caching for monorepo path-alias correctness across package boundaries.
- `peerDependenciesMeta` no longer lists `enhanced-resolve` and `get-tsconfig` (consumers don't need to peer-provide them; this is **technically breaking** but no consumer impact is expected).

### Added

- `oxc-resolver` is now a hard `dependencies` entry. Note for adopters: NAPI prebuilds cover common targets (Linux x64/arm64 glibc + musl, macOS x64/arm64, Windows x64); rare targets may need to fall back to a build step.

## [1.3.3] - 2026-02-08

This was a version bump only for eslint-devkit to align it with other projects, there were no code changes.

## [1.3.2] - 2026-02-06

This was a version bump only for eslint-devkit to align it with other projects, there were no code changes.

# Changelog

All notable changes to `@interlace/eslint-devkit` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-30

### 🚀 Features

- Enhanced LLM message formatting utilities.
- Improved TypeScript typings for IDE support.

### 🩹 Fixes

- Compatibility fixes for TS strict mode.
- More accurate type guards for AST checking.

### 📌 Notes

- Package name aligned to `@interlace/eslint-devkit` (formerly eslint-plugin-utils).

### ❤️ Thank You

- Ofri Peretz

---

## [0.3.0] - 2025-11-15

### 🚀 Features

- Enhanced type utilities.
- Improved AST helpers.
- Better LLM-oriented error messaging.

### 🩹 Fixes

- Type checking edge cases.
- Documentation improvements.

### ❤️ Thank You

- Ofri Peretz

---

## [0.2.2] - 2025-11-07

### 🩹 Fixes

- Config fixes; removed codecov vite plugin.
- Adjusted ignore patterns in dependency checks.
- Added vitest to peerDependencies.

### ❤️ Thank You

- Ofri Peretz

---

## [0.2.1] - 2025-11-07

### 🩹 Fixes

- Config and dependency-check adjustments.

### ❤️ Thank You

- Ofri Peretz

---

## [0.2.0] - 2025-11-02

Version bump to align packages; no code changes.

---

## [0.1.1] - 2025-11-02

Version bump to align packages; no code changes.

---

## [0.1.0] - 2025-11-02

Initial prerelease for the devkit utilities.
