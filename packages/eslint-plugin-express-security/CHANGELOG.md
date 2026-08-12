## 2.0.0

### Major Changes

- [#482](https://github.com/ofri-peretz/eslint/pull/482) [`56f5d71`](https://github.com/ofri-peretz/eslint/commit/56f5d71efe293747566a30732489ce40980be097) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Every rule now abstains in files without local Express evidence

  The plugin had no notion of whether a file had Express in it. Measured over
  **107,382 files across 108 repositories**: 5,921 findings, of which **4,450
  (75%) were in files with no Express import** — `no-missing-csrf-protection`
  alone contributed 3,556.

  Every rule now requires local evidence: an import / `require` / dynamic
  `import()` of `express`, **or** a `(req, res, next)` middleware signature.

  The signature arm is deliberately the **three-argument** form only. Two-argument
  `(req, res)` is shared with `node:http`, Next.js API routes and other servers,
  so accepting it would re-import the false positives this change removes. The
  three-argument form with a trailing `next` is the Connect/Express middleware
  contract and essentially nothing else. Error-handling middleware
  `(err, req, res, next)` matches on the tail.

  The import arm alone was not enough: over the 12-repo Express corpus, 68 of 114
  files containing a `(req, res)`-shaped function (60%) import no `express` —
  route modules routinely receive `app` or `router` from their caller.

  After the change the same corpus yields 1,480 findings instead of 5,921, and
  **no recall is lost**: diffed across all 1,003 files that import `express`,
  findings are identical before and after (1,554 → 1,554, zero lost). The 44
  remaining findings outside an `express` import are, by construction, files the
  gate opened on the middleware signature.

  This is a **major** bump: any rule may now stay silent where it previously
  reported.

### Minor Changes

- [#468](https://github.com/ofri-peretz/eslint/pull/468) [`f5a9d0d`](https://github.com/ofri-peretz/eslint/commit/f5a9d0daa384520837dfe619bab9e19cfefec92a) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Three deprecated rules are no longer part of the `recommended` preset:
  `no-missing-cors-check`, `no-missing-csrf-protection` and
  `no-missing-security-headers`.

  All three carry `deprecated: true` and name a replacement that is _already in
  the same preset at `'error'`_ — `no-permissive-cors`, `require-csrf-protection`
  and `require-helmet` respectively. Every adopter was running each check twice
  and getting two findings on one line, where silencing either leaves the other.

  Measured on the 13-repo wild corpus (~1,900 files of real Express and NestJS
  code): 43 findings removed, 355 → 312, and 21 CSRF locations were being
  reported by both rules at once.

  The rules remain exported, so anyone enabling them explicitly is unaffected.
  They are simply no longer on by default.

### Patch Changes

- [#475](https://github.com/ofri-peretz/eslint/pull/475) [`db73308`](https://github.com/ofri-peretz/eslint/commit/db7330857b4669b4ed325dc561f46f82905c56ba) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Stop reporting on evidence that lives in another file, or on no LDAP evidence at all

  **express-security — `require-helmet`, `require-rate-limiting`.** Both required
  `express()` and the middleware registration to be in the _same file_. Splitting
  setup into `setAppConfigurations(app)` is the normal shape for any non-toy
  Express app, so both reported ToniR7/express-typescript-starter, which registers
  `helmet()` and its rate limiter in `utils/appInitialization.ts` and has both
  packages in `dependencies`.

  They now abstain once the app binding is passed to another function: the
  middleware stack is assembled somewhere the rule cannot see, and "no helmet
  here" says nothing about the application.

  **secure-coding — `no-ldap-injection`.** One branch reported any variable whose
  initializer _printed_ containing `req.`, with no LDAP evidence required. It
  flagged `var header = req.headers[field.toLowerCase()]` in **expressjs/morgan**
  — an HTTP logger with no LDAP anywhere — as CWE-90 at CVSS 9.8. The "looks like
  a filter" guard was satisfied by the parentheses of `toLowerCase()`.

  That branch now requires the file to touch LDAP: an `ldapjs`/`ldapts`/
  `activedirectory`/`passport-ldapauth` import (ESM _or_ `require()`, since LDAP
  code in the wild is largely CommonJS), or a call to one of the LDAP sink methods
  the rule already recognises. The rule's other branches each carry their own
  evidence — an LDAP method call, or a literal that parses as a dangerous filter —
  and are unchanged.

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

- Updated dependencies [[`574b1ae`](https://github.com/ofri-peretz/eslint/commit/574b1aef52bdf06f0e48b3d86e9c67206a5a6617)]:
  - @interlace/eslint-devkit@1.12.0

## 1.5.6

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

## 1.5.5

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

## 1.5.4

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

- [#335](https://github.com/ofri-peretz/eslint/pull/335) [`47cde07`](https://github.com/ofri-peretz/eslint/commit/47cde07f13fb128e973a46f2a66a68c3419cdef3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix SDK peer declarations that npm silently ignored

  Twelve plugins listed their target SDKs under `peerDependenciesMeta` with
  `{"optional": true}` but never declared them in `peerDependencies`. npm drops
  any `peerDependenciesMeta` entry that has no matching `peerDependencies` key,
  so the metadata was inert — these packages effectively declared **no SDK peer
  at all**. Nothing warned: the failure mode of a dependency you never declared
  is silence.

  Each SDK now appears in both maps, matching the shape `eslint-plugin-pg` and
  `eslint-plugin-mongodb-security` already use — a supported major range in
  `peerDependencies`, `optional: true` in `peerDependenciesMeta`:

  | Plugin               | SDK                              | Range                                        |
  | :------------------- | :------------------------------- | :------------------------------------------- |
  | `express-security`   | `express`                        | `^4.0.0 \|\| ^5.0.0`                         |
  |                      | `helmet`                         | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0`             |
  |                      | `cors`                           | `^2.0.0`                                     |
  |                      | `csurf`                          | `^1.0.0`                                     |
  |                      | `express-rate-limit`             | `^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` |
  | `jwt`                | `jsonwebtoken`                   | `^8.0.0 \|\| ^9.0.0`                         |
  |                      | `@nestjs/jwt`                    | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0`           |
  |                      | `express-jwt`                    | `^7.0.0 \|\| ^8.0.0`                         |
  |                      | `jose`                           | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0`             |
  |                      | `jwks-rsa`                       | `^3.0.0 \|\| ^4.0.0`                         |
  |                      | `jwt-decode`                     | `^3.0.0 \|\| ^4.0.0`                         |
  | `lambda-security`    | `@aws-sdk/client-lambda`         | `^3.0.0`                                     |
  |                      | `@middy/core`                    | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/http-cors`               | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/http-security-headers`   | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/validator`               | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  | `maintainability`    | `typescript`                     | `>=4.8.4`                                    |
  | `nestjs-security`    | `@nestjs/common`                 | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0`           |
  |                      | `@nestjs/throttler`              | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0`             |
  |                      | `class-validator`                | `^0.14.0 \|\| ^0.15.0`                       |
  |                      | `class-transformer`              | `^0.5.0`                                     |
  | `react-features`     | `typescript`                     | `>=4.8.4`                                    |
  | `vercel-ai-security` | `ai`                             | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  | `jwt-security`       | same six as `jwt`                | (identical ranges)                           |
  | `openai-security`    | `openai`                         | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@openai/agents`                 | `>=0.1.0 <1.0.0`                             |
  | `anthropic-security` | `@anthropic-ai/sdk`              | `>=0.1.0 <1.0.0`                             |
  |                      | `@anthropic-ai/claude-agent-sdk` | `>=0.1.0 <1.0.0`                             |
  | `gemini-security`    | `@google/genai`                  | `^1.0.0 \|\| ^2.0.0`                         |
  | `mcp-sdk-security`   | `@modelcontextprotocol/sdk`      | `^1.0.0`                                     |

  Ranges were taken from each SDK's real release history, bounded below by the
  oldest major whose call shape the rules still match and above by the current
  major. `cors`, `csurf`, `class-transformer` and `@aws-sdk/client-lambda` have
  only ever shipped one usable major. The `ai` range spans v4 because
  `require-max-steps` deliberately accepts both the v4 `maxSteps` option and the
  v5+ `stopWhen` form. The two `typescript` entries reuse the `>=4.8.4` bound
  `@interlace/eslint-devkit` already declares, since these are the same
  type-aware-graceful rules behind the same optional TS program.

  Every range admits the version this repo's `__compatibility__` specs are
  actually tested against, so the declaration cannot drift from what CI proves.

  The four SDKs still on `0.x` (`@openai/agents`, both Anthropic packages) use an
  explicit `>=0.1.0 <1.0.0` rather than a caret, because `^0.115.0` resolves to
  `>=0.115.0 <0.116.0` — a range narrow enough to warn on almost every real
  install. These rules match on call shape and never import the SDK, so the
  honest constraint is the pre-1.0 line, not a single minor.

  `peer-declaration-integrity.test.ts` now locks the invariant across every
  workspace package: a `peerDependenciesMeta` key with no `peerDependencies` twin
  fails the suite and is named in the diff. This class had already been fixed
  once, in a commit that never merged — nothing went red in its absence, so the
  bug came back on four newly published packages. A silent failure needs a lock,
  not review attention.

  **Nothing to migrate.** Every entry stays optional, so no install adds a
  package or emits a warning when the SDK is absent. What changes is that a
  consumer on an unsupported major now gets a peer warning instead of nothing —
  which was the point of the metadata in the first place.

- Updated dependencies [[`85e57a7`](https://github.com/ofri-peretz/eslint/commit/85e57a7c2facace33cae73749f6385fb8c7da41b), [`74bbf60`](https://github.com/ofri-peretz/eslint/commit/74bbf60fe22feaed15df4330e73db1f72a8cee98), [`e5d31ab`](https://github.com/ofri-peretz/eslint/commit/e5d31abb924de8473ba64093d6d514f3c44049ae), [`1fb1cad`](https://github.com/ofri-peretz/eslint/commit/1fb1caddf8e5c20d43de9cede5d66565b297bee6), [`d1a3d8c`](https://github.com/ofri-peretz/eslint/commit/d1a3d8c62778ed027a8c522a3cf9b12a3b1c90b9)]:
  - @interlace/eslint-devkit@1.8.0

## 1.5.3

### Patch Changes

- [#364](https://github.com/ofri-peretz/eslint/pull/364) [`86baa02`](https://github.com/ofri-peretz/eslint/commit/86baa026485bf93d63f1523d6eb382e0a40cbb3f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the ecosystem and oxlint marks to the README logo row. Each plugin now
  leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
  postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
  vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
  without an ecosystem mark. README-only change - no rule behaviour is affected.
  The patch bump is what carries the new README onto npm, which only refreshes a
  package README on publish.

## 1.5.2

### Patch Changes

- [#358](https://github.com/ofri-peretz/eslint/pull/358) [`1b8c0df`](https://github.com/ofri-peretz/eslint/commit/1b8c0df38d460dda7d18e886c891984208e62259) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix SDK peer declarations that npm silently ignored

  Seven plugins listed their target SDKs under `peerDependenciesMeta` with
  `{"optional": true}` but never declared them in `peerDependencies`. npm drops
  any `peerDependenciesMeta` entry that has no matching `peerDependencies` key,
  so the metadata was inert — these packages effectively declared **no SDK peer
  at all**. Nothing warned: the failure mode of a dependency you never declared
  is silence.

  Each SDK now appears in both maps, matching the shape `eslint-plugin-pg` and
  `eslint-plugin-mongodb-security` already use — a supported major range in
  `peerDependencies`, `optional: true` in `peerDependenciesMeta`:

  | Plugin               | SDK                            | Range                                        |
  | :------------------- | :----------------------------- | :------------------------------------------- |
  | `express-security`   | `express`                      | `^4.0.0 \|\| ^5.0.0`                         |
  |                      | `helmet`                       | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0`             |
  |                      | `cors`                         | `^2.0.0`                                     |
  |                      | `csurf`                        | `^1.0.0`                                     |
  |                      | `express-rate-limit`           | `^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` |
  | `jwt`                | `jsonwebtoken`                 | `^8.0.0 \|\| ^9.0.0`                         |
  |                      | `@nestjs/jwt`                  | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0`           |
  |                      | `express-jwt`                  | `^7.0.0 \|\| ^8.0.0`                         |
  |                      | `jose`                         | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0`             |
  |                      | `jwks-rsa`                     | `^3.0.0 \|\| ^4.0.0`                         |
  |                      | `jwt-decode`                   | `^3.0.0 \|\| ^4.0.0`                         |
  | `lambda-security`    | `@aws-sdk/client-lambda`       | `^3.0.0`                                     |
  |                      | `@middy/core`                  | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/http-cors`             | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/http-security-headers` | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  |                      | `@middy/validator`             | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
  | `maintainability`    | `typescript`                   | `>=4.8.4`                                    |
  | `nestjs-security`    | `@nestjs/common`               | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0`           |
  |                      | `@nestjs/throttler`            | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0`             |
  |                      | `class-validator`              | `^0.14.0 \|\| ^0.15.0`                       |
  |                      | `class-transformer`            | `^0.5.0`                                     |
  | `react-features`     | `typescript`                   | `>=4.8.4`                                    |
  | `vercel-ai-security` | `ai`                           | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |

  Ranges were taken from each SDK's real release history, bounded below by the
  oldest major whose call shape the rules still match and above by the current
  major. `cors`, `csurf`, `class-transformer` and `@aws-sdk/client-lambda` have
  only ever shipped one usable major. The `ai` range spans v4 because
  `require-max-steps` deliberately accepts both the v4 `maxSteps` option and the
  v5+ `stopWhen` form. The two `typescript` entries reuse the `>=4.8.4` bound
  `@interlace/eslint-devkit` already declares, since these are the same
  type-aware-graceful rules behind the same optional TS program.

  Every range admits the version this repo's `__compatibility__` specs are
  actually tested against, so the declaration cannot drift from what CI proves.

  **Nothing to migrate.** Every entry stays optional, so no install adds a
  package or emits a warning when the SDK is absent. What changes is that a
  consumer on an unsupported major now gets a peer warning instead of nothing —
  which was the point of the metadata in the first place.

- Updated dependencies [[`e8e9ee6`](https://github.com/ofri-peretz/eslint/commit/e8e9ee6d521bac301d0554e54ec22afbe8f49e98)]:
  - @interlace/eslint-devkit@1.7.0

## 1.5.1

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

## 1.5.0

### Minor Changes

- [#313](https://github.com/ofri-peretz/eslint/pull/313) [`1f4fc05`](https://github.com/ofri-peretz/eslint/commit/1f4fc05b4798020d7ad9f2524256ba4f2bcbb2a9) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Eight new rules closing the two fixable gaps found by the F#24/F#26 coverage
  benchmark (CWE Top 25 map + framework-depth matrix).

  **Express — the helmet header family** (the depth gap where SonarJS led 17 rules
  to our 14; `require-helmet` only proved the middleware was mounted, never that
  its protections were still on):

  - `no-disabled-helmet-protections` (CWE-693) — `helmet({ contentSecurityPolicy: false })` and the rest of the disabled-default family, helmet 6 and 7 spellings
  - `require-strict-transport-security` (CWE-319) — HSTS disabled, `max-age` below the 180-day preload floor, or `includeSubDomains: false`
  - `no-unsafe-csp-directives` (CWE-79 / 1021 / 311) — `'unsafe-inline'`, `'unsafe-eval'`, wildcard sources, `frame-ancestors '*'`, missing `frame-ancestors` under `useDefaults: false`, and `upgradeInsecureRequests: null`
  - `no-permissive-trust-proxy` (CWE-348) — `app.set('trust proxy', true)`, which makes `req.ip` client-controlled and every rate-limit bucket forgeable

  **Express — CWE Top 25 (2025) access-control adjacency** (three of the four
  JS-applicable entries we did not cover):

  - `require-route-authentication` (CWE-306) — critical-function routes with no auth middleware and no principal read in the handler
  - `no-client-controlled-authorization` (CWE-863) — `if (req.body.role === 'admin')`: the check runs, and passes for anyone who sets the field
  - `no-idor-resource-access` (CWE-639) — `Invoice.findById(req.params.id)` in a handler that never mentions the caller

  **Node — the fourth adjacency** (CWE-77, generic command injection, previously
  covered only as CWE-78):

  - `no-dynamic-command-string` (CWE-77) — an assembled command string handed to a shell flag (`spawn('bash', ['-c', …])`) or to a command-runner that does not escape (`execaCommand`, `$.raw`)

  In `recommended`, the five structural rules ship as `error`; the three
  access-control rules ship as `warn` — their critical-path / authorization-attribute
  / lookup-method vocabularies are name-based, and naming heuristics never carry
  enforcement severity (plugin scope-audit invariant I3).

### Patch Changes

- Updated dependencies [[`a5fad9f`](https://github.com/ofri-peretz/eslint/commit/a5fad9f97a5ef5a64c091d5174fec74fbe1e96c3), [`0231140`](https://github.com/ofri-peretz/eslint/commit/023114046b2844d3daab88f40293bddd75519fe3), [`4cc62d6`](https://github.com/ofri-peretz/eslint/commit/4cc62d63908f91a7c54addadf21678c46c2bcc19)]:
  - @interlace/eslint-devkit@1.6.0

## 1.4.0

### Minor Changes

- [#292](https://github.com/ofri-peretz/eslint/pull/292) [`5664efd`](https://github.com/ofri-peretz/eslint/commit/5664efdc4df72a8621253b2d500c82b09944fd49) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - **`express-security/no-exposed-debug-endpoints` — only route registrations count.** The rule had a second listener that reported _any_ bare string literal equal to a debug path (`/admin`, `/health`, `/debug`, …) anywhere in a file. A redirect-URL constant tripped it while authoring benchmark corpus fixtures — `const ADMIN_PATH = '/admin'`, `res.redirect('/admin')` and `if (req.path === '/health')` were all CWE-489 "Exposed Debug Endpoint" findings, none of which registers an endpoint. That listener is gone: a literal is reported only as the path argument of an express route registration.

  The registration check also now covers every express routing method (`put`, `patch`, `delete`, `head`, `options`, `all`) rather than just `get` / `post` / `use`, plus the chained route builder (`app.route('/admin').delete(handler)`), so `app.delete('/admin/users/:id', handler)` is caught where it previously was not. Conversely, `app.get(name)` with a single argument is an application-setting lookup rather than a route registration and is no longer reported.

- [#293](https://github.com/ofri-peretz/eslint/pull/293) [`d6e2b3c`](https://github.com/ofri-peretz/eslint/commit/d6e2b3ccdcaed3797cffc49772c1b7fa56e78a82) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Seven new rules closing benchmark-corpus coverage gaps (A-lite research wave):

  - `no-host-header-in-links` (CWE-640) — Host-header poisoning in password-reset/email link construction
  - `no-error-details-in-response` (CWE-209) — stack traces / raw error objects sent to clients
  - `no-sensitive-data-in-query` (CWE-598) — passwords/tokens read from GET query strings
  - `no-user-controlled-render-locals` (CWE-73) — `res.render(view, req.body)` template object injection
  - `no-static-root-exposure` (CWE-548) — `express.static(__dirname)` / `serve-index` directory exposure
  - `require-case-insensitive-path-guard` (CWE-178) — case-sensitive path guards bypassed by `/ADMIN`
  - `require-query-type-guard` (CWE-843) — string methods on `req.query` members without type guards

  In the recommended preset four ship as `error` (`no-host-header-in-links`,
  `no-error-details-in-response`, `no-user-controlled-render-locals`,
  `no-static-root-exposure`) and three as `warn` — the two `require-*` guard
  heuristics plus `no-sensitive-data-in-query`, which matches on parameter names
  and so never gets enforcement severity.

### Patch Changes

- [#298](https://github.com/ofri-peretz/eslint/pull/298) [`a53887f`](https://github.com/ofri-peretz/eslint/commit/a53887fdcb4ba5fad0d9f06a19a295d125c7e144) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - **`express-security/no-missing-security-headers` — `.set()` on a non-response receiver is not a header call.** The rule matched `setHeader` / `header` / `set` on the method name alone, so `url.searchParams.set('page', '2')` and `app.set('view engine', 'ejs')` were reported as CVSS 7.5 missing-security-header findings — a false positive on two of the most common calls in an Express codebase. The receiver must now be an HTTP response (`res` / `resp` / `response` / `reply`, including `ctx.res.set(…)` and `this.response.header(…)`). The same predicate gates header _collection_, so a `Content-Security-Policy` string passed to an unrelated `.set()` no longer satisfies the requirement for a real response in the same scope.

- [#294](https://github.com/ofri-peretz/eslint/pull/294) [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Rewrite `description` and `keywords` on every published package for npm search discovery. npm ranks on name, description, and keywords, and the registry only picks up these fields at publish — so this is metadata-only and takes effect for each package on its next release.

  **Descriptions now lead with the search phrase.** Every one starts `ESLint plugin for <the thing you'd search>` instead of a brand-first or category-first framing, and names the concrete vulnerabilities the plugin actually detects. Three were corrected while doing so:

  - `eslint-plugin-import-next` claimed "100x faster no-cycle detection". No 100x measurement exists: `CLAIMS.md` records **3.1x end-to-end** (8x in pure rule execution) on a 5,483-file React codebase, and the highest number in any benchmark result is 54.9x on the synthetic corpus. The description now states the real-codebase figure.
  - `eslint-plugin-secure-coding` claimed SQL injection, XSS and CSRF coverage — none of which are its rules. It now names what it does detect: LDAP, XPath, XXE, GraphQL and template injection, unsafe deserialization, ReDoS, missing authentication, and PII in logs.
  - `eslint-plugin-secure-coding` ("89 rules") and `eslint-plugin-react-a11y` ("37 rules") hard-coded rule counts that had drifted from reality. Counts are generated into `interlace-numbers.json`; hand-typed copies are removed rather than corrected.

  **Keywords now match the vocabulary of the plugins that rank.** `eslint-plugin-security`, `eslint-plugin-jsx-a11y`, `eslint-plugin-n` and `eslint-plugin-import` all carry the `eslint` / `eslintplugin` / `eslint-plugin` trio — six of our packages were missing `eslintplugin`, and every one now carries all three plus `static-analysis`, `linting` and `code-quality`. Security plugins add `sast`, `appsec` and `vulnerability`; `node-security` and `secure-coding` also carry `nodesecurity`, the exact keyword `eslint-plugin-security` ranks on. Each plugin gained the CWE identifiers and attack names for what it detects (`cwe-78` command injection, `cwe-22` path traversal, `cwe-89` SQL injection, `cwe-79` XSS, `cwe-347` JWT algorithm confusion, `cwe-352` CSRF, `cwe-943` NoSQL injection), and `node-security` gained the crypto vocabulary it had been missing entirely despite absorbing the crypto rule set (`crypto`, `cryptography`, `weak-hash`, `md5`, `sha1`, `timing-attack`).

  No rule behavior, exports, or configuration changes.

- Updated dependencies [[`e1cdf83`](https://github.com/ofri-peretz/eslint/commit/e1cdf83e3db761907f0ab06f7fc6c1f1da7513a5), [`659f6dc`](https://github.com/ofri-peretz/eslint/commit/659f6dc0181b03b675f72b5949fcf123dd066358)]:
  - @interlace/eslint-devkit@1.4.3

## 1.3.4

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 1.3.3

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 1.3.2

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 1.3.1

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

## 1.3.0

### Minor Changes

- [#169](https://github.com/ofri-peretz/eslint/pull/169) [`ae39ec5`](https://github.com/ofri-peretz/eslint/commit/ae39ec52bf619351e6217a823014fc05bb97d618) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - feat: add `no-user-controlled-redirect` rule — structural CWE-601 open redirect detection

  Fires on `res.redirect(req.query.*)`, `res.redirect(req.body.*)`, and `res.redirect(req.params.*)` — an AST-structural check that passes the naming-heuristic litmus test (rename `res`/`req` to any identifier and the rule still fires, because detection is on the member-access chain, not on variable names). Severity: `error` in flagship config.

### Patch Changes

- [#143](https://github.com/ofri-peretz/eslint/pull/143) [`213cde1`](https://github.com/ofri-peretz/eslint/commit/213cde190ff2aea49ca7c1b533170940f879d9b4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(no-missing-null-checks): eliminate 53 false positives via three new narrowing patterns

  Rules that were recognized as null guards are now correctly identified as safe:
  1. **Truthy if guard** — `if (obj) { obj.prop }` — direct truthy check proves non-null. Also covers chains: `if (response)` protects `response.data.items`.
  2. **Short-circuit AND** — `obj && obj.prop` — right side of `&&` only runs when left is truthy.
  3. **Ternary consequent** — `obj ? obj.prop : fallback` — truthy test guards the consequent.

  Also: bumped `beforeAll` timeout to 30 seconds in 7 compatibility test files (`__compatibility__/*.spec.ts`). Native-addon packages routinely exceed the previous 10-second default on a cold ESM load.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

## [1.2.3] - 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## [1.2.2] - 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## [1.2.1] - 2026-02-02

This was a version bump only for eslint-plugin-express-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-express-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)

## [1.0.0] - 2025-12-29

### Added

#### Headers & CORS Rules (4)

- `require-helmet` - Require helmet middleware for security headers (CWE-693)
- `no-permissive-cors` - Detect wildcard CORS origins (CWE-942)
- `no-cors-credentials-wildcard` - Block credentials: true with wildcard origin (CWE-942)
- `require-express-body-parser-limits` - Require body parser size limits (CWE-770)

#### CSRF & Cookies Rules (2)

- `require-csrf-protection` - Require CSRF middleware for state-changing routes (CWE-352)
- `no-insecure-cookie-options` - Detect missing Secure/HttpOnly cookie attributes (CWE-614)

#### Rate Limiting & DoS Rules (2)

- `require-rate-limiting` - Require rate limiting middleware (CWE-770)
- `no-express-unsafe-regex-route` - Detect ReDoS-vulnerable regex patterns (CWE-1333)

#### GraphQL Rules (1)

- `no-graphql-introspection-production` - Disable GraphQL introspection in production (CWE-200)

#### Presets (4)

- `recommended` - Balanced security defaults
- `strict` - All 9 rules as errors
- `api` - HTTP/API security rules only
- `graphql` - GraphQL-specific rules only

#### Features

- LLM-optimized error messages with CWE references
- OWASP Top 10 2021 alignment (A01, A03, A05, A07)
- Middleware-aware detection (helmet, cors, csurf, express-rate-limit)
- TypeScript support with exported option types
- Comprehensive test coverage (132 tests, 93.15% line coverage)

### Security

- Covers 6 CWEs: 200, 352, 614, 693, 770, 942, 1333
- Maps to OWASP Top 10 2021: A01, A03, A05, A07
