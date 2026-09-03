# eslint-plugin-postgresql-security

All notable changes to `eslint-plugin-postgresql-security` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 2.3.3

### Patch Changes

- **🐛 Fix** — String.raw statements survive the parser bump

  `@typescript-eslint` 8.68.0 changed `TemplateElement.value.cooked`: 8.54.0
  typed it `string` and emitted the RAW text for an escape it could not cook,
  8.68.0 types it `string | null` and emits `null`. Both directions were verified
  against a real 8.54.0 install, not read off a changelog.

  `check-query-params` carried a comment reading "`cooked` is typed non-nullable
  and this parser never nulls it". Its own regression lock — "String.raw with an
  escape the cooked value cannot hold" — was the ONLY thing in the repo that
  caught the change. `no-unsafe-search-path`, `no-unsafe-copy-from` and the module
  gate that recognises a `postgres://` DSN unwrap `String.raw` too and had the
  same defect, now locked individually. The four rules whose statement text comes
  from an argument node cannot be reached by a tagged template and assert instead.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.1`

## 2.3.2

### Patch Changes

- **🐛 Fix** — `pool['connect']()` checks out the same client

  `no-missing-client-release` matched the checkout on `property.name`, so a
  subscripted connect never entered the release tracking at all.

- **🐛 Fix** — `this['pool']` and `db['query']` name the same pool and statement

  `no-transaction-on-pool` tracked the pool field and the query call by
  `property.name` in three places — the `this.pool` read, the `this.pool = new
Pool()` binding, and the `.query('BEGIN')` sink.

- **🐛 Fix** — `c['release']()` is the same client release

  `no-missing-client-release` matched the release call on `property.name`. With
  it resolved the rule now gives the MORE precise finding on a subscripted
  release outside a `finally` — `releaseNotGuaranteed` rather than
  `missingClientRelease`.

- **🐛 Fix** — a quoted object key resolves like a bare one

  Gates across this plugin compared `property.name` before asking what the
  property was, so `o['k']` — the notation minifiers and generated clients
  emit — did not reach them. They now resolve through the devkit's
  `propertyName` / `objectKeyName`.

- **🧹 Refactor** — pool-field tracking records the name its guard accepted

  `SET.has(propertyName(node) as string)` reaches the right answer for the wrong
  reason. `propertyName` returns `string | null` because `o[k]` names a property
  the AST cannot read, and that is not the same answer as "named, and not one of
  these" — the cast collapses both, and `Set.prototype.has(null)` being false is
  what made it look correct.

  3 sites across 2 files now ask the two questions separately, via
  `namesOneOf` / `memberPropertyName` from the devkit or an explicit `!== null`.

  No rule behaviour changes: this package's test count and coverage are unchanged.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.0`

## 2.3.1

### Patch Changes

- **🐛 Fix** — Add an install-size badge to the README prelude, linking to each package's packagephobia page. npm renders the README from the last publish, so a badge only appears on npmjs.com after a release.

  Install size rather than bundle size: bundlephobia measures a browser bundle,
  and nobody bundles an ESLint plugin into one, so the number would describe no
  real cost. It was also returning `429` for every package, `react` included.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.18.2`

## 2.3.0

### Minor Changes

- **✨ Feature** — **🐛 Fix** — a template literal is a string, in 82 rules that disagreed

  A rule that matched `require('child_process')` did not match
  ``require(`child_process`)``. A rule that matched `res.headers['x-api-key']`
  did not match ``res.headers[`x-api-key`]``. Nothing about the two spellings
  differs at runtime, and no consumer chose one on purpose — which is exactly
  why the miss was invisible: the rule looked correct in its own tests, because
  its tests were written in the same spelling as its implementation.

  Rules across these plugins now read a static string wherever the value is
  statically known: a plain literal, a template literal with no substitutions,
  and a concatenation of either. The same pass fixed computed member access, so
  `o['foo']` is read wherever `o.foo` was.

  **These rules now report on code they previously stayed quiet on.** That is
  the point — the missed spelling was a false negative, not an exemption — but
  a codebase written with backticks may see new findings on upgrade.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.18.0`

## 2.2.1

### Patch Changes

- **🐛 Fix** — point `meta.docs.url` at documentation that exists ([#683](https://github.com/ofri-peretz/eslint/pull/683))

  `meta.docs.url` is what ESLint hands to editors, CLI output and SARIF, so a wrong
  value is a dead "see docs" link in every consumer's IDE. It was wrong for 319 of
  478 rules, all pointing at `packages/eslint-plugin/` — a package that does not
  exist in this repo.

  `withCanonicalDocsUrls` already existed to fix this, but `docsUrlFor` hardcoded
  the `/docs/security/` path segment, so it could not express the nine quality
  plugins and rollout had stalled at three of twenty-six. The category is now
  derived per plugin, and every documented plugin stamps its rules on export.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.2`

## 2.2.0

### Minor Changes

- [#574](https://github.com/ofri-peretz/eslint/pull/574) [`79f480f`](https://github.com/ofri-peretz/eslint/commit/79f480f21e369d0fec45985d33d4080b6989980d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rules decide by evidence, and every vocabulary is now an option

  A large sweep replacing name-substring inference with resolved evidence, and
  exposing the word lists that remained as configurable options with explicit
  defaults.

  **Expect new findings on code that was previously silent.** These are rules
  shipping at `error` in `recommended`, so this will surface in consumer repos.
  The findings are not new bugs in your code; they are shapes the rules could not
  previously see.

  ## What will newly report

  The largest single source is `secure-coding/no-sql-injection`, where a function
  parameter is now treated as a caller-supplied inlet by default
  (`treatParametersAsUntrusted`, default `true`). Before, a taint root had to be
  visible in the same file, so the commonest real shape in a codebase —

  ```js
  export function search(term) {
    return db.query(`SELECT * FROM items WHERE name LIKE '%${term}%'`);
  }
  ```

  — was silent. Set `treatParametersAsUntrusted: false` to restore the old
  behaviour.

  Also newly detected across the ecosystem: SQL assembled by a local helper and
  then executed (arguments are now bound across the call boundary); `+=` append
  builders and `Array#join`; the driver query-config object
  (`db.query({ text, values })`); big-endian `Buffer.read*BE` readers, which is
  what a network protocol parser actually uses; `req.headers['x'] || ''`, which
  previously terminated the taint walk; uppercase URL schemes (`HTTP://`,
  `WS://`), which evaded three rules and one autofix; and `window.fetch` /
  `self.fetch` / `globalThis.fetch`, the last of which is the only spelling
  available inside a Worker.

  ## What will stop reporting

  False positives that decided from a spelling. Among the measured ones:
  `if (passengers.length >= 4)` reported as a weak password requirement;
  `localStorage.getItem("recipe-casserole-draft")` as client-side auth logic
  (`role` ⊂ `casserole`); `carpoolClient.query('BEGIN')` — a ride-sharing API — as
  a transaction on a pg Pool; `poolClient.query('BEGIN')`, which is the
  _remediation_; `const PARAM = "static"` as an unescaped URL parameter; and
  `<link rel="canonical">` as mixed content, which every SSR app has.

  `postgresql-security/prevent-double-release` no longer infers release state from
  a flag's spelling, so it stops flagging a correct guard named `settled` and
  starts catching a genuine double release guarded by a flag that is never
  assigned.

  ## New options

  Every vocabulary that decides a report is now an option with an explicit default
  matching the previous behaviour exactly, in both `defaultOptions` and
  `meta.schema`, with an `additional*` variant where extending rather than
  replacing is the common case. Sets that are a fixed API surface rather than a
  vocabulary — Node's `createCipheriv`, the Service Worker `Cache` write methods,
  CSP directive names, IANA media types, the ldapjs call signature — are
  deliberately **not** configurable: making them so would let a consumer silence a
  rule on precisely the shapes it exists to find.

### Patch Changes

- Updated dependencies [[`79f480f`](https://github.com/ofri-peretz/eslint/commit/79f480f21e369d0fec45985d33d4080b6989980d)]:
  - @interlace/eslint-devkit@1.16.1

## 2.1.0

### Minor Changes

- [#531](https://github.com/ofri-peretz/eslint/pull/531) [`d63ce04`](https://github.com/ofri-peretz/eslint/commit/d63ce040c6b6d7ca87cac93c57f249b7a807f127) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Presets now emit rule ids prefixed with the package's own name, so registering
  the plugin under that name works.

  Both packages were renamed (`eslint-plugin-jwt` → `eslint-plugin-jwt-security`,
  `eslint-plugin-pg` → `eslint-plugin-postgresql-security`) but their presets kept
  emitting the pre-rename `jwt/` and `pg/` prefixes. Registering under the package
  name — the shape every README shows — failed outright:

  ```
  A configuration object specifies rule "jwt/no-algorithm-none",
  but could not find plugin "jwt".
  ```

  `configs.recommended` / `flagship` / `strict` now emit `jwt-security/…` and
  `postgresql-security/…`. The legacy keys (`jwt`, `pg`) stay registered in each
  preset's `plugins` block for a deprecation window, so a config that already
  writes the old rule ids alongside these presets keeps resolving. They are
  removed in the next major.

  If you spread `…configs.recommended.rules` and register the plugin yourself,
  register it under the package name (`'jwt-security'` / `'postgresql-security'`).
  Spreading the whole config object needs no change.

## 2.0.0

### Major Changes

- [#479](https://github.com/ofri-peretz/eslint/pull/479) [`73807cb`](https://github.com/ofri-peretz/eslint/commit/73807cbfc9bab90f67a1328c680d69a0034fca64) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Every rule now abstains in files without local PostgreSQL evidence

  The plugin had no notion of whether a file used PostgreSQL at all.
  `no-missing-client-release` fired on any `.connect()` — mongoose, redis,
  socket.io. `no-unsafe-query` fired on any `.query()`. `no-select-all` fired on
  `SELECT *` in any string anywhere.

  Measured over **108,838 files across 108 repositories**: 1,305 findings, of
  which **1,222 (94%) were in files with no PostgreSQL client**. Two rules were
  wrong 100% of the time — `no-missing-client-release` (49 findings, 0 in a
  PostgreSQL file) and `prevent-double-release`.

  All thirteen rules now require local evidence that the file uses PostgreSQL: an
  import or `require` of a PostgreSQL client, or a `postgres://` / `postgresql://`
  connection string in the file. Nothing is read from `package.json` and nothing
  is resolved across files, so there is no project state to go stale.

  After the change the same corpus yields 100 findings instead of 1,305.

  This is a **major** bump: any rule may now stay silent where it previously
  reported. A file that reaches PostgreSQL only through a wrapper module is a
  deliberate miss — the trade against reporting on code with no database in it.

### Patch Changes

- [#494](https://github.com/ofri-peretz/eslint/pull/494) [`4c4af8d`](https://github.com/ofri-peretz/eslint/commit/4c4af8d62b64eabe5be1636345f7a56f63372b43) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Close two false-negative classes across every SDK-evidence gate

  A full false-negative audit ran every gated plugin twice over the 107-repository
  corpus — once with the gates forced open, once as shipped — and compared the
  **6,686 findings the gates silence across 5,235 files**. Of those files, 134 were
  flagged as suspect (the SDK _is_ imported but the gate closed anyway), and two
  real defect classes came out of verifying them one by one.

  **1. TypeScript's import-equals form was invisible to four of the five gates.**
  `import express = require('express')` is a `TSImportEqualsDeclaration` whose
  module reference is a `TSExternalModuleReference` — not a `require`
  `CallExpression` — so the dynamic-load arm never saw it. **82 corpus files
  written this way for Express alone had every rule in the plugin silenced.** Only
  `mongodb-security` handled it, and only because an earlier audit forced the
  issue. Now handled by express, lambda, postgresql and vercel-ai too.

  **2. Deno's module specifiers were unrecognisable to all five.**
  `npm:@aws-sdk/client-bedrock-runtime` and
  `https://deno.land/x/postgres@v0.17.0/mod.ts` are ordinary SDK imports in Deno
  and Supabase Edge Functions; the prefix made the specifier unmatchable and the
  whole plugin abstained on real SDK code. Both forms are now normalised before
  the package test.

  **`postgresql-security` also had no dynamic `import()` arm at all** — alone
  among the five — so a file that lazily loads its driver was silenced entirely.
  Every other gate has carried that arm since [#481](https://github.com/ofri-peretz/eslint/issues/481).

  **Measured, not assumed.** Re-sweeping the same 119,271 files with the fixes:
  **198 findings recovered across 88 files** (196 express, 1 postgres, 1 lambda)
  and **zero regressions** — nothing that reported before is silenced now.

  The two non-Express recoveries are the clearest illustration of what was broken:
  `no-missing-authorization-check` on a Supabase Edge Function calling Bedrock, and
  `no-missing-client-release` on a Deno postgres pool driver. Both are real
  serverless code that the ecosystem was blind to.

  Verification also **ruled out** four groups the generous probe flagged, rather
  than widening the gates to swallow them: `@serverless/*` and
  `@aws-lambda-powertools/*` hits were the frameworks' own source (one specifier
  was inside a JSDoc `@example` block), and `@payloadcms/db-mongodb` /
  `@medusajs/deps/pg` were type-only imports of adapter packages in files that
  never touch the driver.

  Each new arm ships a positive control in the plugin's `module-gate.lock.test.ts`
  — import-equals, `npm:`, and `deno.land/x` for every gate, plus the dynamic
  `import()` case for postgres — so none of them can regress silently. All four
  packages remain at 100% statements / branches / functions / lines.

- [#483](https://github.com/ofri-peretz/eslint/pull/483) [`de0c475`](https://github.com/ofri-peretz/eslint/commit/de0c475ddc76d0a27d5744be5fa0aafcf1333fb5) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix a false negative: `require` shadowing is now lexical, not file-wide

  Both module gates raised a single "this file shadows `require`" flag for the
  whole file. So `const client = require('pg'); function wrapper(require) {}` was
  read as fully shadowed: the real module load at module scope was ignored and
  every rule in the plugin abstained.

  That trades a false positive for a false negative, which is the worse trade —
  a security rule that silently stops reporting is the defect class that matters
  most.

  Shadowing now propagates down the walk and applies only inside the scope that
  binds the name: a function whose parameters include `require`, or a
  Program/BlockStatement whose direct body declares one. A `require()` outside
  that scope is module loading again.

- Updated dependencies [[`574b1ae`](https://github.com/ofri-peretz/eslint/commit/574b1aef52bdf06f0e48b3d86e9c67206a5a6617)]:
  - @interlace/eslint-devkit@1.12.0

## 1.5.3

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

- [#414](https://github.com/ofri-peretz/eslint/pull/414) [`d527f14`](https://github.com/ofri-peretz/eslint/commit/d527f1485512db5441aa269e207d1b7510bf29bb) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Remove the superseded `eslint-plugin-pg` and `eslint-plugin-jwt` sources from
  the monorepo.

  Both were renamed to their `-security` names and every published version on npm
  is deprecated. The sources stayed in `packages/`, and because
  `.changeset/config.json` has `ignore: []`, **every release versioned and
  republished them** — `eslint-plugin-pg@1.4.13` and `eslint-plugin-jwt@2.2.13`
  went out on 2026-08-05. A newly published version carries no deprecation flag,
  so each release silently un-deprecated the packages until someone re-ran
  `npm deprecate`.

  Deleting the sources is what stops that loop; re-deprecating alone gets undone
  by the next release.

  No published rule is lost. The `-security` packages carry identical rule sets
  (13 each, verified by comparing the rule directories) and keep the original
  `pg/` and `jwt/` rule namespaces, so no consumer config changes. The published
  catalogue is unchanged at 465 rules across 30 plugins — the removed entries were
  already marked unpublished, which is why the totals only drop for the
  including-unpublished count (491 → 465).

  Also fixes a user-facing consequence the removal surfaced: the playground's
  copy-config button derived package names as `eslint-plugin-<prefix>`, so `jwt/`
  and `pg/` findings emitted install lines for the **deprecated** packages. Those
  two prefixes are now mapped explicitly, with a lock.

- Updated dependencies [[`b59e984`](https://github.com/ofri-peretz/eslint/commit/b59e984f8f98dcb59e6bd5d4ef23a75376821d17), [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25), [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211)]:
  - @interlace/eslint-devkit@1.11.0

## 1.5.2

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

## 1.5.1

### Patch Changes

- [#377](https://github.com/ofri-peretz/eslint/pull/377) [`85e57a7`](https://github.com/ofri-peretz/eslint/commit/85e57a7c2facace33cae73749f6385fb8c7da41b) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Complete the logo row across every published package.

  The six AI SDK family plugins landed after the logo row shipped, so they had no
  marks; @interlace/eslint-devkit never had a header row at all. All of them now
  carry Interlace -> ecosystem -> oxlint -> ESLint (devkit has no ecosystem mark).

  The four AI SDK READMEs are also brought to the canonical structure they were
  missing: Philosophy, Getting Started, Configuration Presets, Compatibility,
  Related Plugins, and the 11-column rule table with the type-awareness column.

  README-only change; no rule behaviour is affected. The patch bump is what
  carries the new README onto npm, which only refreshes a package README on
  publish.

- [#335](https://github.com/ofri-peretz/eslint/pull/335) [`47cde07`](https://github.com/ofri-peretz/eslint/commit/47cde07f13fb128e973a46f2a66a68c3419cdef3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix the `./oxlint` subpath export, which pointed at `src/oxlint.js` — a file no build produces. `require('<package>/oxlint')` threw MODULE_NOT_FOUND on every published package, while every README documented that exact wiring for oxlint's `jsPlugins`. The export now points at the build output, `dist/src/oxlint.js`.

  The path was hardcoded in `scripts/generate-oxlint-shims.ts`, so the generator rewrote any manual correction back to the broken value on the next drift check — fixed there rather than per package.

  This release also carries npm provenance: the affected packages were last published from a workstation, which has no OIDC token to attest with, so the published tarballs had no attestation. Publishing through the release workflow signs them.

- Updated dependencies [[`85e57a7`](https://github.com/ofri-peretz/eslint/commit/85e57a7c2facace33cae73749f6385fb8c7da41b), [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98), [`e5d31ab`](https://github.com/ofri-peretz/eslint/commit/e5d31abb924de8473ba64093d6d514f3c44049ae), [`1fb1cad`](https://github.com/ofri-peretz/eslint/commit/1fb1caddf8e5c20d43de9cede5d66565b297bee6), [`d1a3d8c`](https://github.com/ofri-peretz/eslint/commit/d1a3d8c62778ed027a8c522a3cf9b12a3b1c90b9)]:
  - @interlace/eslint-devkit@1.8.0

## 1.4.9

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

## 1.4.8

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 1.4.7

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 1.4.6

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 1.4.5

### Patch Changes

- [#213](https://github.com/ofri-peretz/eslint/pull/213) [`391dbe6`](https://github.com/ofri-peretz/eslint/commit/391dbe6b39f78d549379218567cb959649f8c614) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Align every security rule's `meta.docs.cvss` to the CVSS its finding actually
  emits. The emitted machine-readable message sources its `CVSS:x` from
  `CWE_MAPPING` via `formatLLMMessage` → `enrichFromCWE`, but the static
  `meta.docs.cvss` documentation field had drifted on 45 rules across these 7
  plugins — e.g. `no-hardcoded-credentials` documented `9.5` while emitting
  `CVSS:9.8` (the value the published article and SARIF/LLM consumers already
  read).

  This corrects the **documentation metadata only** — no emitted finding changes.
  Locked by `security-cvss-docs-consistency.lock.test.ts` (cross-plugin: every
  security rule's `meta.docs.cvss` must equal the CVSS it emits), the
  `no-hardcoded-credentials` rule lock (real ESLint `Linter` emission), and a
  devkit `enrichFromCWE` contract test pinning `CWE-798 → 9.8`.

  Follow-up (not in scope): 50 security rules document a CVSS that never appears
  in any emitted message (their messages carry no CWE), and several rules emit the
  generic CWE score where a rule-specific score may be warranted — both change
  emitted output and are separate decisions.

## 1.4.4

### Patch Changes

- [#143](https://github.com/ofri-peretz/eslint/pull/143) [`213cde1`](https://github.com/ofri-peretz/eslint/commit/213cde190ff2aea49ca7c1b533170940f879d9b4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(no-missing-null-checks): eliminate 53 false positives via three new narrowing patterns

  Rules that were recognized as null guards are now correctly identified as safe:
  1. **Truthy if guard** — `if (obj) { obj.prop }` — direct truthy check proves non-null. Also covers chains: `if (response)` protects `response.data.items`.
  2. **Short-circuit AND** — `obj && obj.prop` — right side of `&&` only runs when left is truthy.
  3. **Ternary consequent** — `obj ? obj.prop : fallback` — truthy test guards the consequent.

  Also: bumped `beforeAll` timeout to 30 seconds in 7 compatibility test files (`__compatibility__/*.spec.ts`). Native-addon packages routinely exceed the previous 10-second default on a cold ESM load.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))
- resolve all benchmark FN/FP across security rules ([45ffb791](https://github.com/ofri-peretz/eslint/commit/45ffb791))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## 1.4.3 — 2026-02-08

## 1.4.2 — 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## 1.4.1 — 2026-02-02

This was a version bump only for eslint-plugin-postgresql-security to align it with other projects, there were no code changes.

## 0.0.1 — 2024-12-20

### Added

- Initial release with 13 rules for PostgreSQL security and best practices

#### Security Rules (6)

- `no-unsafe-query` - Prevents SQL injection via string interpolation
- `no-insecure-ssl` - Prevents disabling SSL certificate validation
- `no-hardcoded-credentials` - Prevents hardcoded passwords in config
- `no-unsafe-search-path` - Prevents dynamic search_path hijacking
- `no-unsafe-copy-from` - Prevents COPY FROM file path exposure
- `no-transaction-on-pool` - Prevents transaction commands on pool

#### Resource Management Rules (3)

- `no-missing-client-release` - Ensures pool clients are released
- `prevent-double-release` - Prevents double client.release()
- `no-floating-query` - Ensures query promises are handled

#### Quality & Performance Rules (4)

- `check-query-params` - Validates parameter count matches placeholders
- `no-select-all` - Discourages SELECT \*
- `prefer-pool-query` - Suggests pool.query() for simple queries
- `no-batch-insert-loop` - Prevents N+1 mutation queries

#### Presets

- `recommended` - Balanced security and quality settings
- `strict` - All rules as errors

#### Documentation

- Full documentation for all 13 rules
- AGENTS.md for AI assistant integration
- Benchmark folder for capability demonstration
