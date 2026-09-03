# eslint-plugin-vercel-ai-security

All notable changes to `eslint-plugin-vercel-ai-security` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 2.1.2

### Patch Changes

- **🐛 Fix** — `ai['generateText'](…)` is the same SDK call as `ai.generateText`

  A member spelled `o['k']` reaches exactly what `o.k` reaches, and these gates
  compared `property.name` before asking what the property was. They now resolve
  through the devkit's `propertyName`, which still abstains on the one shape that
  genuinely cannot be resolved: a key chosen at runtime, whose name is not
  statically known.

- **🧹 Refactor** — the AI SDK call test no longer casts an unnameable member

  `SET.has(propertyName(node) as string)` reaches the right answer for the wrong
  reason. `propertyName` returns `string | null` because `o[k]` names a property
  the AST cannot read, and that is not the same answer as "named, and not one of
  these" — the cast collapses both, and `Set.prototype.has(null)` being false is
  what made it look correct.

  1 site across 1 file now ask the two questions separately, via
  `namesOneOf` / `memberPropertyName` from the devkit or an explicit `!== null`.

  No rule behaviour changes: this package's test count and coverage are unchanged.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.19.0`

## 2.1.1

### Patch Changes

- **🐛 Fix** — Add an install-size badge to the README prelude, linking to each package's packagephobia page. npm renders the README from the last publish, so a badge only appears on npmjs.com after a release.

  Install size rather than bundle size: bundlephobia measures a browser bundle,
  and nobody bundles an ESLint plugin into one, so the number would describe no
  real cost. It was also returning `429` for every package, `react` included.

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.18.2`

## 2.1.0

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

## 2.0.1

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

## 2.0.0

### Major Changes

- [#489](https://github.com/ofri-peretz/eslint/pull/489) [`17ca941`](https://github.com/ofri-peretz/eslint/commit/17ca94142e1e18f09f798b5ab86ad1f57ea10a56) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Every rule now abstains in files without local Vercel AI SDK evidence

  The plugin had no notion of whether a file used the AI SDK. Measured over
  **107,384 files across 107 pinned repositories**: 1,909 findings, of which
  **1,738 (91%) were in files with no `ai` / `@ai-sdk` import** — the highest
  off-SDK rate in the ecosystem. `no-hardcoded-api-keys` alone contributed 782,
  `no-training-data-exposure` 410, `require-output-validation` 314.

  Every rule now requires local evidence: an `import`, `require`, or dynamic
  `import()` of `ai` or any `@ai-sdk/*` package, matched on the package root and
  never on a relative specifier. The `@ai-sdk` scope is matched whole rather than
  as an enumerated provider list, so a consumer on `@ai-sdk/mistral` or a provider
  that ships next month is covered on arrival — an allow-list would silently stop
  opening the gate, and a security rule that quietly stops reporting is the worse
  failure direction.

  **The evidence is imports only, and that is a deliberate departure from the
  Express gate.** Express needed a second, signature-based arm because 60% of
  files holding a real `(req, res)` handler import no `express` — route modules
  receive `app`/`router` from a caller. The same measurement here says the
  opposite. Of the 29 non-`.d.ts` corpus files that call `generateText`,
  `streamText`, `streamObject`, `generateObject` or `useChat` without importing
  the SDK, **zero are the Vercel AI SDK**:

  - 16 import that same name from a different vendor — both `@kapaai/react-sdk`
    and `@orama/ui/hooks/useChat` export a `useChat`
  - `stream-json` exposes `StreamObject.streamObject()`
  - `swig-email-templates` has `generateText(path, ctx, html, cb)`
  - LangChain's IBM provider calls `this.service.generateText(...)`
  - the last two are a `streamText` inside a JSDoc code fence and a `generateText`
    inside a JSON string literal of CMS seed content

  A call-signature arm would therefore re-admit exactly the false positives this
  gate removes — detecting a _word_ rather than an _SDK_, which is the root defect
  behind every gate in this ecosystem.

  A locally bound `require` is not module loading: `function f(require) {
require('ai') }` does not open the gate. Shadowing is **lexical**, propagated
  down the walk, so `const ai = require('ai'); function wrap(require) {}` still
  reports — the file-wide flag that regressed express/postgres in [#483](https://github.com/ofri-peretz/eslint/issues/483) is not
  repeated here. The probe is cached per `Program`, so nineteen rules cost one AST
  walk rather than nineteen.

  **Recall cost measured, not assumed.** Every finding over all 3,386 corpus files
  that import the SDK was diffed before and after: **8,157 → 8,143**. The 14
  removed are all in one file, `vercel-ai/content/tools-registry/registry.ts`,
  whose only `import … from 'ai'` occurrences are inside `codeExample:` template
  literals — the file imports nothing. All 14 were `no-hardcoded-api-keys` firing
  on `apiKeyUrl: 'https://vercel.com/docs/…'`, public documentation URLs matched
  because the property name contains `apiKey`. **Zero real findings lost, and the
  one file affected demonstrates the defect rather than a cost.**

  Locked by `src/module-gate.lock.test.ts` over the whole rule registry, so a rule
  added later fails until it is gated too. The negatives are the measured
  vendor-collision shapes above; five positive controls (static import, scoped
  provider, an un-enumerated provider, `require`, and a dynamic `await import`)
  prevent the suite passing with the gate shut on everything.

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

- Updated dependencies [[`574b1ae`](https://github.com/ofri-peretz/eslint/commit/574b1aef52bdf06f0e48b3d86e9c67206a5a6617)]:
  - @interlace/eslint-devkit@1.12.0

## 1.5.4

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

- Updated dependencies [[`b59e984`](https://github.com/ofri-peretz/eslint/commit/b59e984f8f98dcb59e6bd5d4ef23a75376821d17), [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25), [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211)]:
  - @interlace/eslint-devkit@1.11.0

## 1.5.3

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

## 1.5.2

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

## 1.5.1

### Patch Changes

- [#364](https://github.com/ofri-peretz/eslint/pull/364) [`86baa02`](https://github.com/ofri-peretz/eslint/commit/86baa026485bf93d63f1523d6eb382e0a40cbb3f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the ecosystem and oxlint marks to the README logo row. Each plugin now
  leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
  postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
  vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
  without an ecosystem mark. README-only change - no rule behaviour is affected.
  The patch bump is what carries the new README onto npm, which only refreshes a
  package README on publish.

## 1.5.0

### Minor Changes

- [#262](https://github.com/ofri-peretz/eslint/pull/262) [`4a89231`](https://github.com/ofri-peretz/eslint/commit/4a892319d10a3e00798ddb6ec9446b934369c726) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Catch AI output interpolated into SQL, and accept `max_output_tokens`

  `no-unsafe-output-handling` now walks a template literal's `${...}`
  expressions and the operands of a `+` chain instead of pattern-matching the
  whole source text. This closes a false negative where a tracked binding —
  ``const { text } = await generateText(...); db.query(`... ${text}`)`` — was
  missed even though the eval and innerHTML branches already tracked it. Text
  matching only ever caught the `${result.text}` spelling, because the patterns
  look for `.text` while the destructured source reads `text`. It also drops a
  false positive on SQL whose literal text merely contained a pattern word
  (e.g. a `generated_reports` table name).

  `require-max-tokens` now accepts `max_output_tokens`. It already accepted the
  snake_case spelling of the v4 name (`max_tokens`) but not of the v5 one, so a
  call bounded through a provider-shaped config object was still reported.

### Patch Changes

- [#359](https://github.com/ofri-peretz/eslint/pull/359) [`b2e887b`](https://github.com/ofri-peretz/eslint/commit/b2e887bb5dec8eff3d2907e4422e382abaac99d5) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Document the options the rules actually accept

  Ten option names appeared in rule docs but not in the rules' schemas. Because
  every schema sets `additionalProperties: false`, copying one out of the docs
  did not fail quietly — it aborted the whole lint run:

  ```
  Key "rules": Key "vercel-ai-security/no-hardcoded-api-keys":
    Value {"keyPatterns":[...]} should NOT have additional properties.
    Unexpected property "keyPatterns". Expected properties: "apiKeyPatterns".
  ```

  Six of the seven affected tables were fictional end to end — not one
  documented option existed. Affected rules: `no-hardcoded-api-keys`,
  `no-unsafe-output-handling`, `require-abort-signal`, `require-max-steps`,
  `require-max-tokens`, `require-tool-schema` and
  `browser-security/no-sensitive-localstorage`.

  Three "Mitigation: configure X" notes pointed at knobs that are hardcoded and
  were never configurable; they now say so instead of promising a fix that
  cannot be applied.

  No rule behaviour changes — this is documentation catching up to the schemas.

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

## 1.4.2

### Patch Changes

- [#340](https://github.com/ofri-peretz/eslint/pull/340) [`0bd0626`](https://github.com/ofri-peretz/eslint/commit/0bd0626f0755a71ae41b48b095ea505a98c01fc4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Don't read a computed property key as if it were a property name.

  `getStaticPropName` took a key node and returned `key.name` for any Identifier,
  without checking whether the property was computed. In `{ [instructions]: value }`
  the key node _is_ an Identifier called `instructions` — but it's a variable
  reference, and the property actually being set is whatever that variable holds.
  All four rules that resolve the system prompt (`no-dynamic-system-prompt`,
  `require-validated-prompt`, `require-rag-content-validation`,
  `no-sensitive-in-prompt`) therefore treated an arbitrary property as the system
  prompt.

  The helper now takes the `Property` node and returns `null` for computed keys.

  This only misfires when the variable is named exactly like the property, which is
  why the existing computed-key fixtures missed it — they used variables named
  `key` and `originKey`. The new regression test uses the collision case.

  Found while fixing the identical bug in `eslint-plugin-nestjs-security`; the same
  helper shape had been copied between the two plugins.

## 1.4.1

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

## 1.4.0

### Minor Changes

- [#299](https://github.com/ofri-peretz/eslint/pull/299) [`608defb`](https://github.com/ofri-peretz/eslint/commit/608defbbce6818e2ad4f51d7425e044c4ca04e3e) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Detect the AI SDK v7 `instructions` option, not just the deprecated `system`.

  AI SDK v7 renamed the system-prompt option to `instructions` and marks `system` as
  `@deprecated Use 'instructions' instead` in its own type definitions. Four rules matched
  the property name `system` literally, so on any code written against current AI SDK docs
  they reported nothing at all:

  - `no-dynamic-system-prompt`
  - `require-validated-prompt` (its `unsafeSystemPrompt` branch)
  - `require-rag-content-validation`
  - `no-sensitive-in-prompt`

  All four now accept either spelling via a shared `SYSTEM_PROMPT_PROPS` set, so `system`
  keeps working for pre-v7 code and `instructions` is covered going forward.

  The same pass closed a second silent miss in those rules: a quoted key
  (`{ "instructions": … }`) parses to a string `Literal`, not an `Identifier`, and
  three of the four rules read only `Identifier` keys — so putting quotes round the
  key was enough to stop them firing. Key extraction now goes through a shared
  `getStaticPropName` helper. Three fixtures that recorded this as expected
  behaviour (one labelled "documented FN: only Identifier keys are matched") moved
  from `valid` to `invalid`, since a rule that stops firing on formatting is a miss,
  not a design decision. Computed keys (`{ [k]: … }`) still return `null` — there
  the name genuinely isn't statically known.

  This was found the hard way. Scanning the `nuxt-ui-templates/chat` template, a system
  prompt interpolating the signed-in user's name straight into `instructions:` went
  unreported — the finding was spotted by reading the file, not by the linter that exists to
  catch it. Each of the four rules now carries a regression test that fails if the
  `instructions` spelling is dropped again, and one of them uses the exact template-literal
  shape from that file.

### Patch Changes

- Updated dependencies [[`09d2951`](https://github.com/ofri-peretz/eslint/commit/09d2951b3ac74efc9ba49b64e9089d66800b16cc)]:
  - @interlace/eslint-devkit@1.4.4

## 1.3.10

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

## 1.3.9

### Patch Changes

- [#277](https://github.com/ofri-peretz/eslint/pull/277) [`d1ad332`](https://github.com/ofri-peretz/eslint/commit/d1ad332cc7366887482b288bcf65098d425501d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Accept AI SDK v5+ idioms: `stopWhen` (e.g. `stopWhen: stepCountIs(5)`) now satisfies require-max-steps, and `maxOutputTokens` (v5 rename of `maxTokens`) satisfies require-max-tokens — fixing false positives on v5/v7 code.

## 1.3.8

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 1.3.7

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 1.3.6

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

- [#143](https://github.com/ofri-peretz/eslint/pull/143) [`213cde1`](https://github.com/ofri-peretz/eslint/commit/213cde190ff2aea49ca7c1b533170940f879d9b4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - fix(no-missing-null-checks): eliminate 53 false positives via three new narrowing patterns

  Rules that were recognized as null guards are now correctly identified as safe:
  1. **Truthy if guard** — `if (obj) { obj.prop }` — direct truthy check proves non-null. Also covers chains: `if (response)` protects `response.data.items`.
  2. **Short-circuit AND** — `obj && obj.prop` — right side of `&&` only runs when left is truthy.
  3. **Ternary consequent** — `obj ? obj.prop : fallback` — truthy test guards the consequent.

  Also: bumped `beforeAll` timeout to 30 seconds in 7 compatibility test files (`__compatibility__/*.spec.ts`). Native-addon packages routinely exceed the previous 10-second default on a cold ESM load.

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

## 1.3.5 — 2026-02-09

This was a version bump only for eslint-plugin-vercel-ai-security to align it with other projects, there were no code changes.

## 1.3.3 — 2026-02-08

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## 1.3.2 — 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## 1.3.1 — 2026-02-02

This was a version bump only for eslint-plugin-vercel-ai-security to align it with other projects, there were no code changes.

## 1.0.1 — 2024-12-13

### Added

- **Peer Dependencies**: Added explicit peer dependency requirements:
  - `eslint`: `^8.0.0 || ^9.0.0`
  - `ai` (Vercel AI SDK): `^3.0.0 || ^4.0.0 || ^5.0.0`

### Changed

- Updated README compatibility section to reflect supported versions

---

## 0.2.0 — 2024-12-13

### Added

#### 🔒 New Security Rules (+5)

- **`no-system-prompt-leak`** - Prevent system prompts from being exposed in API responses (LLM07)
- **`no-dynamic-system-prompt`** - Prevent dynamic content in system prompts (ASI01)
- **`require-output-filtering`** - Require filtering of sensitive data in tool output (ASI04)
- **`require-audit-logging`** - Suggest audit logging for AI operations (ASI10)
- **`require-rag-content-validation`** - Validate RAG content before use in prompts (ASI07)

#### ⚙️ New Configuration

- **`minimal`** - Gradual adoption config with only 2 critical rules

#### 📚 Documentation

- Individual documentation for all 15 rules in `/docs/rules/`
- Updated README with complete OWASP coverage tables
- Options documentation for each rule

### Changed

- **Plugin version**: 0.1.0 → 0.2.0
- **Total rules**: 10 → 15
- **Total tests**: 122 → 168
- **OWASP LLM coverage**: 5/10 → 6/10
- **OWASP Agentic coverage**: 5/10 → 9/10

---

## 0.1.0 — 2024-12-13

### Added

#### 🔒 Security Rules (10 Total)

##### Critical Priority

- **`require-validated-prompt`** - Detect unsafe prompts (CWE-74, OWASP LLM01)
- **`no-sensitive-in-prompt`** - Prevent secrets/PII in prompts (CWE-200, OWASP LLM02)
- **`no-hardcoded-api-keys`** - Detect hardcoded API keys (CWE-798, OWASP ASI03)
- **`no-unsafe-output-handling`** - Prevent unsafe output handling (CWE-94, OWASP LLM05/ASI05)

##### High Priority

- **`require-tool-schema`** - Ensure tools have Zod inputSchema (CWE-20, OWASP ASI02)
- **`require-max-tokens`** - Require maxTokens limit (CWE-770, OWASP LLM10)
- **`require-max-steps`** - Require maxSteps for multi-step tool calling (CWE-834, OWASP LLM10)
- **`require-tool-confirmation`** - Require confirmation for destructive tools (CWE-862, OWASP ASI09/LLM06)

##### Medium Priority

- **`require-error-handling`** - Require try-catch for AI calls (CWE-755, OWASP ASI08)
- **`require-abort-signal`** - Require AbortSignal for streaming calls (CWE-404)

#### ⚙️ Configurations

- `recommended` - Balanced security (critical rules as errors, high as warnings)
- `strict` - Maximum security (all rules enabled)

#### 📊 Coverage

- **122 tests passing**
- **98.31% line coverage**
- **100% function coverage**

#### 📚 Documentation

- Comprehensive README with AEO optimization
- AGENTS.md for AI coding assistants
- Full OWASP LLM Top 10 and OWASP Agentic Top 10 mapping

#### Supported Functions

- `generateText` - Full coverage
- `streamText` - Full coverage with abort signal
- `generateObject` - Full coverage
- `streamObject` - Full coverage with abort signal
- `tool()` helper - Schema validation
