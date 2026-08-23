# eslint-plugin-lambda-security

All notable changes to `eslint-plugin-lambda-security` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 2.0.0

### Major Changes

- [#481](https://github.com/ofri-peretz/eslint/pull/481) [`7907d1c`](https://github.com/ofri-peretz/eslint/commit/7907d1c6135ceb86f4dd8b8d7fd489cc1921c18f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Every rule now abstains in files without local Lambda evidence

  The plugin had no notion of whether a file was Lambda code.
  `no-error-swallowing` fired on any `try/catch` anywhere while its own
  description claimed to detect "empty catch blocks in Lambda handlers", and four
  rules contained no Lambda reference at all, not even in prose.

  Measured over **107,382 files across 108 repositories**: 9,473 findings, of
  which **9,244 (98%) were in files with no AWS anything in them**. A plain
  `JSON.parse` helper was being told it had an AWS Lambda defect.

  Every rule now requires local evidence that the file is Lambda code. The
  evidence is a **union**, because an import gate alone is the wrong gate here:
  measured over the 12-repo Lambda corpus, 413 files export a handler and **184
  of them (45%) import nothing AWS** — `aws-lambda` is a types package and a
  plain JS handler imports nothing. So the gate accepts a handler export, or the
  `(event, context)` calling convention, or an AWS import / require / dynamic
  import. All three are read from the file itself.

  After the change the same corpus yields 723 findings instead of 9,473.

  This is a **major** bump: any rule may now stay silent where it previously
  reported. Verified cost: exactly **4** in-SDK findings across the corpus, all in
  one `@aws-lambda-powertools/batch` library file that carries no in-file Lambda
  evidence — it imports only relative paths and takes
  `(event, recordHandler, processor, options)`. Library code reached only through
  a wrapper is the deliberate miss.

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

## 1.3.4

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

- [#463](https://github.com/ofri-peretz/eslint/pull/463) [`76db9b3`](https://github.com/ofri-peretz/eslint/commit/76db9b3e75d916fa37ee84b23cf487cc55627d6e) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-error-swallowing` no longer reports a catch that handles its error.

  The rule detected handling by regexing the block's printed source, so it
  missed `next(err)`, `reject(err)` and every response call, while matching any
  identifier that merely started with "log" — including inside comments and
  string literals. Its return check additionally demanded the returned
  expression match `/500|error|fail/`, so `return false` from a hostname
  validator read as swallowing.

  Detection is now AST-based. A catch handles its error when it logs, forwards
  to a callback (`next`, `reject`, `callback`, `done`), answers the request
  (`res.status(...)`, `res.end()`), or returns a **fail-closed** value.

  Fail-open returns still report, and that distinction is the point:
  `catch { return false }` denies, `catch { return true }` grants access on a
  malformed token. `true`, a 2xx `statusCode`, `null` and `undefined` are all
  excluded from the exemption.

  Removes the rule's findings from four ILB-CWE-Corpus fixtures. The corpus
  false-positive total drops from 16 to 13 rather than 4, because
  `pipeline-promises.js` is still reported by
  `node-security/detect-non-literal-fs-filename` — that fixture builds a read
  path straight from `req.params.id`, so the remaining finding is a true
  positive against a mislabelled fixture. No true positives lost.

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

## 1.3.3

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

## 1.3.2

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

## 1.3.1

### Patch Changes

- [#364](https://github.com/ofri-peretz/eslint/pull/364) [`86baa02`](https://github.com/ofri-peretz/eslint/commit/86baa026485bf93d63f1523d6eb382e0a40cbb3f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the ecosystem and oxlint marks to the README logo row. Each plugin now
  leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
  postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
  vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
  without an ecosystem mark. README-only change - no rule behaviour is affected.
  The patch bump is what carries the new README onto npm, which only refreshes a
  package README on publish.

## 1.3.0

### Minor Changes

- [#325](https://github.com/ofri-peretz/eslint/pull/325) [`baefb93`](https://github.com/ofri-peretz/eslint/commit/baefb93acb7d9859fe6eb48c6f7f959dc6b90172) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-permissive-cors-response`: remove the dead `allowedOrigins` option.

  The option was declared in the rule's `Options` interface, its JSON `schema`
  (described as "Patterns for allowed origins"), and its `defaultOptions` — but
  `create()` only ever read `allowInTests`. Configuring
  `['error', { allowedOrigins: ['https://foo.com'] }]` passed ESLint's schema
  validation and then did nothing, with no error to tip the user off.

  Removed rather than implemented. The rule reports on exactly one value — the
  literal `'*'` — so an allowlist of concrete origins can never match anything it
  flags. Making the option meaningful would mean widening the rule to flag _any_
  hardcoded origin, which would newly report code the rule's own autofix produces
  (`"https://your-domain.com"`). That is a different rule, not a bug fix.

  **Migration:** if you had `allowedOrigins` in your config, delete it — it never
  had an effect. Because the schema uses `additionalProperties: false`, leaving it
  in place now surfaces an ESLint config validation error instead of being
  silently ignored.

  Locked by a schema assertion in both `no-permissive-cors-response` and its
  sibling `no-permissive-cors-middy` (already clean) that fails if either rule
  declares an option `create()` does not read.

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

## 1.2.11

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

## 1.2.10

### Patch Changes

- [#311](https://github.com/ofri-peretz/eslint/pull/311) [`9e93ae2`](https://github.com/ofri-peretz/eslint/commit/9e93ae20369996bd462666366ba9a842ec2827f3) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Close two detection gaps found while linting a real serverless example.

  **`no-unvalidated-event-body` — see past value-preserving wrappers.** The safe-pattern checks only looked at `event.body`'s _direct_ parent, so `schema.safeParse(JSON.parse(event.body ?? '{}'))` — the standard way to give an optional API Gateway body a default — was a CVSS 8.0 finding: the `??` sat between the property access and the validating call and defeated every check. The rule now walks past `??` / `||`, `as` assertions and `!` non-null assertions before deciding, which also fixes `if (event.httpMethod === 'POST' && event.body)` being reported as unvalidated.

  **`no-permissive-cors-response` — read implicit-return arrow bodies.** The rule only inspected explicit `return { statusCode, headers, body }` statements and `*response*`-named variables, so the idiomatic response helper `const jsonResponse = (statusCode, data) => ({ statusCode, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) })` was invisible — the exact shape most handlers funnel every response through. Concise arrow bodies returning a Lambda-shaped object are now checked, with the same `statusCode`/`body` gate so ordinary config objects stay unflagged.

- Updated dependencies [[`a5fad9f`](https://github.com/ofri-peretz/eslint/commit/a5fad9f97a5ef5a64c091d5174fec74fbe1e96c3), [`0231140`](https://github.com/ofri-peretz/eslint/commit/023114046b2844d3daab88f40293bddd75519fe3), [`4cc62d6`](https://github.com/ofri-peretz/eslint/commit/4cc62d63908f91a7c54addadf21678c46c2bcc19)]:
  - @interlace/eslint-devkit@1.6.0

## 1.2.9

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

## 1.2.8

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 1.2.7

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 1.2.6

### Patch Changes

- [#225](https://github.com/ofri-peretz/eslint/pull/225) [`34ff5a8`](https://github.com/ofri-peretz/eslint/commit/34ff5a8e6f5126c5d1c0a524759e0af2b5476b46) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - CI-only: pin all coverage thresholds at 100% (integration target, merges last).

## 1.2.5

### Patch Changes

- [#220](https://github.com/ofri-peretz/eslint/pull/220) [`ad8416d`](https://github.com/ofri-peretz/eslint/commit/ad8416d4db196bf0b24942ddabbfaefb0cae7bab) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix runtime crashes when linting realistic AWS Lambda handlers under ESLint 9.

  The published `1.2.3` tarball was a **stale build**: its rules still threw on the
  generated lambda-ai-corpus handlers, even though source had already been fixed.
  This republishes the corrected build and locks it with a regression test.
  - **`no-error-swallowing`** no longer throws `RangeError: Maximum call stack size
exceeded`. The old build walked the catch-block AST by hand and recursed through
    the cyclic `node.parent` reference; source now uses `sourceCode.getText()` + a
    regex.
  - **`require-timeout-handling`**, **`no-missing-authorization-check`**, and
    **`no-unbounded-batch-processing`** no longer throw `Error: Unknown class name:
exit`. They used a grouped `:exit` selector (`'A:exit, B:exit, C:exit'`); ESLint
    only strips the trailing `:exit`, so esquery received a bare `:exit`. Source now
    uses one listener key per node type.
  - `plugin.meta.version` is now read from `package.json` instead of a hardcoded
    string, so a build can no longer mislabel its own version (1.2.3 embedded
    `1.1.0`).

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

## 1.2.4

### Patch Changes

- [#144](https://github.com/ofri-peretz/eslint/pull/144) [`8843ce7`](https://github.com/ofri-peretz/eslint/commit/8843ce7fbb465caad161b97032467b3a37a49319) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix: ILB-Wild FP reduction + doc examples + doc-test-alignment scanner fixes

  **`no-unlimited-resource-allocation` — FP reduction (430 Edge FPs)**
  - Skip loop-allocation reporting when the first argument is a numeric literal (e.g. `Buffer.alloc(1024)` inside a loop is statically bounded, not a risk)
  - Skip `Array.isArray`, `Array.from`, `Array.of` calls in the `alloc/Array` pattern check (these don't allocate unbounded memory)

  **`no-hardcoded-credentials` — FP reduction (~280 Edge FPs)**
  - Extended test-file skip to cover `.fixture.`, `.mock.`, `__mocks__/`, `/tests/`, `/fixtures/`, `/mocks/` paths
  - Skip string literals that are fallback values in `process.env.X || 'fallback'` expressions — the secret lives in the environment, the string is only a dev-mode default

  **Doc examples — 4 rules now have ❌ Incorrect examples**
  - `lambda-security/no-missing-authorization-check`
  - `lambda-security/no-overly-permissive-iam-policy`
  - `node-security/prefer-native-crypto` (renamed non-standard `### ❌ Third-Party (Flagged)` to `### ❌ Incorrect`)
  - `vercel-ai-security/require-tool-confirmation` (replaced placeholder with a real tested example)

  **`ilb-doc-test-alignment` scanner fixes**
  - Accept both `## ❌` and `### ❌` headings (docs use H3 under an H2 `## Examples` section; was only finding H2)
  - Slice from end-of-line rather than end-of-regex-match (prevents `## ❌ Incorrect Code` from leaving a partial heading in the parsed section)

  Result: `ilb:doc-test-alignment` → 206 ok, 0 doc has no ❌ examples (was 165 missing).

- [#194](https://github.com/ofri-peretz/eslint/pull/194) [`55d5c0a`](https://github.com/ofri-peretz/eslint/commit/55d5c0ab90bfaaecf01be5146a91a2e4b14e1d41) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix a hard crash (`Error: Unknown class name: exit`) that aborted the entire ESLint run on ESLint 9 whenever the `recommended` or `strict` config was enabled.

  Three rules — `require-timeout-handling`, `no-missing-authorization-check`, and `no-unbounded-batch-processing` — registered their function-exit listener as a single comma-joined selector key:

  ```
  'ArrowFunctionExpression:exit, FunctionExpression:exit, FunctionDeclaration:exit'
  ```

  ESLint only strips a **trailing** `:exit` before handing a selector to esquery, so the earlier `:exit` tokens survived into the parser and threw `Unknown class name: exit` for every linted file. Each listener is now registered as one key per node type, which is the only esquery-safe form.

  A config-level regression test (`src/index.test.ts`) now boots the real ESLint engine against both shipped configs, so any future comma-joined `:exit` — or any other unparseable selector in any rule — fails in CI instead of in a consumer's editor.

  `@interlace/eslint-config` re-exports the `recommended` config and is republished against the fixed plugin.

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

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## 1.2.3 — 2026-02-08

## 1.2.2 — 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## 1.2.1 — 2026-02-02

This was a version bump only for eslint-plugin-lambda-security to align it with other projects, there were no code changes.

## 1.0.0 — 2025-12-29

### Added

#### Credential & Secrets Protection Rules (3)

- `no-hardcoded-credentials-sdk` - Detect hardcoded AWS credentials in SDK v3 clients (CWE-798)
- `no-secrets-in-env` - Detect secrets hardcoded in environment variables (CWE-798)
- `no-env-logging` - Detect logging entire process.env object (CWE-532)

#### CORS Security Rules (2)

- `no-permissive-cors-response` - Detect wildcard CORS in Lambda response headers (CWE-942)
- `no-permissive-cors-middy` - Detect permissive CORS in @middy/http-cors middleware (CWE-942)

#### Presets (2)

- `recommended` - Balanced security defaults
- `strict` - All 5 rules as errors

#### Features

- LLM-optimized error messages with CWE references
- OWASP Serverless Top 10 alignment (SAS-2, SAS-3, SAS-4)
- AWS SDK v3 client detection (S3, DynamoDB, Lambda, STS, etc.)
- Middy middleware detection (@middy/http-cors)
- Real AWS access key pattern matching (AKIA*, ASIA*)
- TypeScript support with exported option types
- Comprehensive test coverage (78 tests, 97.40% line coverage)
- Auto-fix for CORS violations

### Security

- Covers 3 CWEs: 532, 798, 942
- Maps to OWASP Serverless Top 10: SAS-2, SAS-3, SAS-4
