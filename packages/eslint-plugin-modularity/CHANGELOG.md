# eslint-plugin-modularity

All notable changes to `eslint-plugin-modularity` are documented here.

Entries below `## <version>` are generated from [changesets](https://github.com/changesets/changesets);
the format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/spec/v2.0.0.html).

## 2.5.0

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

## 2.4.0

### Minor Changes

- **🐛 Fix** — `ddd-anemic-domain-model` matches DTO names by suffix, not substring

  `DTO`, `Dto`, `Data`, `Request`, `Response` and `Payload` describe a naming
  convention that is positional — `OrderDto`, `CreateUserRequest`,
  `LoginPayload`. Matching them with `.includes()` turned each into a substring.

  Because this is a **suppression**, every collision costs a real finding rather
  than adding noise. The same anemic class reports as `Person` and goes silent as
  `Requestor`, purely because `Requestor` contains `Request`. A requestor is an
  actor, not a data carrier, and its anemia is exactly what this rule exists to
  find.

  Genuine DTOs are unaffected: `OrderDto`, `CreateUserRequest`, `UserResponse`,
  `LoginPayload` and `UserData` all stay exempt.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.4`

## 2.3.0

### Minor Changes

- **🐛 Fix** — `ddd-value-object-immutability` matches the naming convention by suffix, and skips generated files

  A census of all 11 findings this rule produced on the pinned 8-repository
  corpus found **11 out of 11 unactionable**. Every one was in twilio's
  auto-generated OpenAPI SDK — header: _"Do not edit the class manually"_ — and
  none was a value object.

  Two independent causes, either of which alone still produced findings:

  **Substring matching.** `className.includes(pattern)` over
  `['Value', 'VO', 'ValueObject']` matched anything _containing_ the marker:
  `CountyCarrierValueCarriers`, `CreateConfigurationRequestChannelSettingsValueCaptureRules`.
  A DDD value object convention names the type `MoneyValue` or `EmailVO` — the
  marker **ends** the name — so the check is now `endsWith`. `VO` was the sharper
  hazard, since it sits inside `ConVOy` and `PiVOt`.

  **No generated-file opt-out.** The remedy this rule gives is "add `readonly`",
  which the next generator run erases.

  If you relied on substring matching, set `valueObjectPatterns` explicitly — the
  option is unchanged, only the comparison is anchored.

### Patch Changes

- **🔗 Dependencies** — updated workspace dependencies: `@interlace/eslint-devkit@1.17.3`

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

- [#608](https://github.com/ofri-peretz/eslint/pull/608) [`087ce59`](https://github.com/ofri-peretz/eslint/commit/087ce5963e4f2e5ecd0603582d5db94e6b7fec43) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `ddd-anemic-domain-model` now only checks code in a **domain layer**.

  An anemic domain model is a defect of a domain layer: an entity holding state
  while its behaviour lives in a service. Outside one, a class with fields and no
  methods is a transport object, an options bag or an error shape — which is what
  a client library is supposed to ship.

  New `domainPaths` option, default `['domain', 'domains', 'entities', 'entity',
'aggregate', 'aggregates', 'model', 'models']`, matched by path **segment**.
  Set it to `[]` to check every class, which is the previous behaviour.

  **526 → 0** on the pinned corpus. Not one finding was in a domain layer: on
  okta-auth-js all 38 sat under `idx/`, `myaccount/`, `errors/`, `exports/`,
  `base/`, `authn/`, `core/` and `http/`.

### Patch Changes

- Updated dependencies [[`3854526`](https://github.com/ofri-peretz/eslint/commit/38545268c6028267787a1cb7c0a7e065babad99c), [`16bae7b`](https://github.com/ofri-peretz/eslint/commit/16bae7ba0451ed19757231be60b8ed88abb35d9e), [`5e0e029`](https://github.com/ofri-peretz/eslint/commit/5e0e029acc7ad5877c915d56bea5f4f707983fe6), [`d81469f`](https://github.com/ofri-peretz/eslint/commit/d81469fa2921043b44b1f042e23cb9148ae72c04), [`a22fd9b`](https://github.com/ofri-peretz/eslint/commit/a22fd9b7755f3988739f9d67a7c209b77836612a), [`6f9124e`](https://github.com/ofri-peretz/eslint/commit/6f9124e5e29a7cf7c5e0dde3127bcf219c1538d7)]:
  - @interlace/eslint-devkit@1.17.0

## 2.1.9

### Patch Changes

- [#530](https://github.com/ofri-peretz/eslint/pull/530) [`776baaf`](https://github.com/ofri-peretz/eslint/commit/776baaf0a694b07aadb2aed14e92a7e22f093186) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-external-api-calls-in-utils` no longer fires on `Map`, `Set`, `Headers`,
  `URLSearchParams` or `Cache` lookups.

  The rule matched on the method NAME alone, so `store.get(key)` in a utils file
  read exactly like `axios.get(url)`. A dogfooding sweep over 123 files produced
  45 findings across 17 files, and every sampled one was a cache lookup.

  A call is now reported only when its callee resolves to an HTTP client:

  - `fetch` / `window.fetch`
  - a binding imported or required from a module in the new `httpModules` option
    (axios, got, ky, node-fetch, undici, superagent, `node:http(s)`, …)
  - an alias of one — `const api = axios.create()` — resolved on `Program:exit`,
    so the client may be declared after its use
  - an explicit `object.method` pair in `networkMethods`, the escape hatch for
    in-house clients the import tracking can't see

  Bare module names still seed the client set, so `axios.get(...)` is caught
  without a visible import — except `request` and `got`, which collide with
  Express's `request` object and ordinary English.

  Measured over 49 real `utils`/`lib`/`helpers` files: 47 findings → 13, every
  survivor a real `fetch(...)`, every dropped one a collection lookup.

## 2.1.8

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

- Updated dependencies [[`b59e984`](https://github.com/ofri-peretz/eslint/commit/b59e984f8f98dcb59e6bd5d4ef23a75376821d17), [`5ecf4d1`](https://github.com/ofri-peretz/eslint/commit/5ecf4d1baa56135ed2029a4477e9c45d8a921e25), [`4794017`](https://github.com/ofri-peretz/eslint/commit/4794017c3e21db2aa0b0f64af2d1703ebca97211)]:
  - @interlace/eslint-devkit@1.11.0

## 2.1.7

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

## 2.1.6

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

## 2.1.5

### Patch Changes

- [#364](https://github.com/ofri-peretz/eslint/pull/364) [`86baa02`](https://github.com/ofri-peretz/eslint/commit/86baa026485bf93d63f1523d6eb382e0a40cbb3f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the ecosystem and oxlint marks to the README logo row. Each plugin now
  leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
  postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
  vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
  without an ecosystem mark. README-only change - no rule behaviour is affected.
  The patch bump is what carries the new README onto npm, which only refreshes a
  package README on publish.

## 2.1.4

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

## 2.1.3

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

## 2.1.2

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 2.1.1

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 2.1.0

### Minor Changes

- [#148](https://github.com/ofri-peretz/eslint/pull/148) [`82718c2`](https://github.com/ofri-peretz/eslint/commit/82718c282895710d42c36d4679fb24d47f1c35c7) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - feat+fix: ILB-Wild FP reduction + two new quality rules

  **`no-unsafe-deserialization` FP reduction (~112 FPs)**
  - Track `fs.readFileSync('literal')` calls in `literalPathFileVars` — a file read with a
    hardcoded path (bundled config) is not user-controlled input for safe deserializers
    (`JSON.parse`, schema-validating parsers). `eval()` still fires even on literal-path reads.

  **`no-buffer-overread` FP reduction (~129 FPs)**
  - Remove `b` (single-char, too broad) and `chunk` (too common for array chunks) from the
    Buffer alias heuristic — `isBufferType` now only matches `buf` and `bytes` by name,
    reducing false matches on non-Buffer variables.

  **New rule: `modernization/prefer-template-literal`**
  - Flags `"string " + variable` concatenation and suggests the equivalent template literal.
  - Auto-fix produces the correct `` `string ${variable}` `` replacement.
  - Pure string literal chains (`"a" + "b"`) and numeric addition are not flagged.
  - Closes P2 quality FN `prob_string_concat` in the ILB-Arena-Quality bench.

  **New rule: `modularity/no-mutable-exports`**
  - Flags `export let` and `export var` — module exports should be immutable `const`
    bindings so all importers share a stable reference.
  - Auto-fix replaces `let`/`var` with `const`.
  - Closes P2 quality FN `prob_mutable_export` in the ILB-Arena-Quality bench.

### Patch Changes

- Updated dependencies [[`736a5fe`](https://github.com/ofri-peretz/eslint/commit/736a5fed47e673f6157ea900b29fe2a54e4bc7df)]:
  - @interlace/eslint-devkit@1.4.1

### Bug Fixes

- align codecov component IDs with full package names ([2831b968](https://github.com/ofri-peretz/eslint/commit/2831b968))

### Documentation

- fix changelog header format across all packages ([c3a15082](https://github.com/ofri-peretz/eslint/commit/c3a15082))

### ❤️ Thank You

- Ofri Peretz

## 2.0.4 — 2026-02-08

## 2.0.3 — 2026-02-06

### Bug Fixes

- align codecov component names and update docs components ([0a59a86c](https://github.com/ofri-peretz/eslint/commit/0a59a86c))

### ❤️ Thank You

- Ofri Peretz

## 2.0.2 — 2026-02-02

This was a version bump only for eslint-plugin-modularity to align it with other projects, there were no code changes.

### Documentation

- 📘 Launched new documentation site: [eslint.interlace.tools](https://eslint.interlace.tools/)
- 📝 Achieved 100% documentation parity (both .md and .mdx files)

## 2.0.1 — 2026-02-02

This was a version bump only for eslint-plugin-modularity to align it with other projects, there were no code changes.

## 2.0.0 — 2026-02-02

This was a version bump only for eslint-plugin-modularity to align it with other projects, there were no code changes.

## 1.0.0 — 2026-01-26

### Added

- Initial stable release with 5 DDD architecture rules
- LLM-optimized error messages for AI-assisted development
- 100% test coverage across all rules
- ESLint 9 flat config support
- TypeScript type definitions for all rule options

### Rules

| Rule                             | Description                                    | 💼  | ⚠️  |
| :------------------------------- | :--------------------------------------------- | :-: | :-: |
| `ddd-anemic-domain-model`        | Detect anemic domain models lacking behavior   | 💼  | ⚠️  |
| `ddd-value-object-immutability`  | Enforce immutability in value objects          | 💼  |     |
| `enforce-naming`                 | Enforce consistent naming conventions by layer | 💼  | ⚠️  |
| `enforce-rest-conventions`       | Enforce RESTful naming in API controllers      | 💼  |     |
| `no-external-api-calls-in-utils` | Prevent external API calls in utility modules  | 💼  |     |

### Presets

- `recommended` - Balanced DDD and architecture enforcement
- `strict` - All rules as errors for strict enforcement

### Fixed (Jan 2026 Remediation)

- **`enforce-naming`**: Implemented `preserveCase` pattern to preserve original casing in suggestions
  - Example: `UserService` → `CustomerService` (not `customerservice`)
- **`ddd-value-object-immutability`**: Added `mutableNestedType` detection
  - Now detects `readonly items: Item[]` where `Item` has mutable properties
- **`ddd-anemic-domain-model`**: Implemented `isPureDelegation` detection
  - Methods that only delegate to external services no longer count as business logic
  - Excludes built-in array methods (`reduce`, `map`, `filter`) appearing as delegation
  - Excludes JS prototypes (`toString`, `valueOf`) on own properties

### Known Limitations

Documented in `docs/KNOWN-LIMITATIONS.md`:

- `ddd-anemic-domain-model`: Logic hidden in base classes outside the current file not detected
- `ddd-value-object-immutability`: Complex object hierarchies from external factories may bypass checks
- `no-external-api-calls-in-utils`: API calls via DI clients or generic wrappers not detected
- Circular dependencies via DI or dynamic `require()` not mapped
