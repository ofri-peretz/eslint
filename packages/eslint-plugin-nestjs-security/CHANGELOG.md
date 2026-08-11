## 3.0.0

### Major Changes

- [#502](https://github.com/ofri-peretz/eslint/pull/502) [`82aebb4`](https://github.com/ofri-peretz/eslint/commit/82aebb405fb9267c22c3edcf97b74087053bc019) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Share one SDK-evidence probe, and gate the last plugin that had none

  `createModuleEvidence` moves the probe into the devkit. Five plugins each
  carried their own copy, so the two false-negative classes the audit found —
  TypeScript's `import =` form and Deno's `npm:` / `deno.land` specifiers — had to
  be fixed five times. One implementation now carries package-root matching,
  rejection of relative specifiers, both dynamic forms, lexically-scoped `require`
  shadowing, an optional non-import evidence arm, and a per-`Program` cache.

  `nestjs-security` is gated on it. Measured over 107,382 files across 107
  repositories, **22% of everything it reported (219 of 999 findings) was in a
  file importing no NestJS package** — its rules key on decorator and method names
  that Angular, TypeORM and plain TypeScript classes share. This is a **major**:
  any rule may now stay silent where it previously reported.

  Every other SDK plugin already abstained, but eight of them proved it only
  inside a devkit factory. They now ship a registry-wide lock as well, so the
  guarantee survives a hand-written rule added tomorrow.

### Patch Changes

- Updated dependencies [[`82aebb4`](https://github.com/ofri-peretz/eslint/commit/82aebb405fb9267c22c3edcf97b74087053bc019)]:
  - @interlace/eslint-devkit@1.13.0

## 2.3.0

### Minor Changes

- [#435](https://github.com/ofri-peretz/eslint/pull/435) [`5d75183`](https://github.com/ofri-peretz/eslint/commit/5d75183a99493f7485b7bbd7500f39bd895822cc) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix a false negative in `no-permissive-cors` and add `no-unsafe-multer-filename`.

  **`no-permissive-cors` now reports the declaration, not just the call site.** A
  CORS config exported from one file and consumed in another was invisible: the
  rule resolved same-file bindings only, so `app.enableCors(corsOptions)` with an
  imported `corsOptions` reported nothing. That is the exact shape of the one
  genuinely exploitable configuration found across 49 NestJS repositories —
  reflected origin, credentials enabled, cookie-based session — and the plugin was
  silent on it.

  A declaration is now reported when it is annotated with `CorsOptions` and that
  annotation resolves to `@nestjs/common`, `@nestjs/platform-*` or `cors`. The
  annotation is the evidence: an object literal with an `origin` key proves
  nothing, and the name `CorsOptions` alone is not classification. Unannotated
  objects behave exactly as before, so nothing is silenced on missing evidence.
  A config that is both declared and used in one file is reported once, at the
  declaration, which is where the fix goes.

  **New rule `no-unsafe-multer-filename` (CWE-22, error in `recommended`).** Flags
  a multer `diskStorage` `filename` callback that stores an upload under the name
  the client chose. `file.originalname` arrives verbatim from the multipart body
  and multer does not normalise it, so a timestamp prefix is not a mitigation —
  the traversal is in the suffix. The rule abstains whenever the name passes
  through any function call, because deciding whether a given sanitiser is
  sufficient means reading code the rule cannot see. Measured over 52,363 files:
  8 callbacks combine `diskStorage` with `originalname`, 5 pass it through raw.

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

## 2.2.0

### Minor Changes

- [#419](https://github.com/ofri-peretz/eslint/pull/419) [`e3052b3`](https://github.com/ofri-peretz/eslint/commit/e3052b3d71ae34b1e26522642ceb99b6d52de6e4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-res-bypass-serialization` no longer reports without evidence of a serializer

  The rule's message — "@Exclude() does not apply" — asserted a consequence it
  never checked for. Run at `error` over four production NestJS codebases, 23 of
  its 27 findings were in repos containing no `ClassSerializerInterceptor` and no
  `@Exclude()` anywhere: a real pattern with no disclosure behind it.

  It now reports only when a serializer is visible on the controller or the
  handler. Set `assumeGlobalSerializer: true` if you register
  `ClassSerializerInterceptor` globally in `main.ts` or via `APP_INTERCEPTOR`,
  which a controller file cannot see.

  Two body shapes are also no longer reported, because neither is an object:
  `res.send(JSON.stringify(x))`, and `res.type('html')` and the other bare
  extensions Express resolves through `mime.lookup`.

### Patch Changes

- [#419](https://github.com/ofri-peretz/eslint/pull/419) [`e3052b3`](https://github.com/ofri-peretz/eslint/commit/e3052b3d71ae34b1e26522642ceb99b6d52de6e4) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `no-hybrid-app-config-loss` reports an accurate CWE and severity

  The rule mapped to CWE-284, which is a Pillar — MITRE marks it Discouraged for
  real findings. It now maps to CWE-20 (Improper Input Validation), the
  consequence that actually reproduces: on NestJS 9.4.3 a Kafka `@MessagePattern`
  handler received a number through a DTO with `@IsString()` when
  `inheritAppConfig` was absent, and rejected it once the flag was set.

  Severity drops from 7.5/HIGH to 5.3/MEDIUM: reaching these handlers requires
  access to the message broker, not merely the network.

  Detection is unchanged, and the rule stays deliberately ungated.

- [#410](https://github.com/ofri-peretz/eslint/pull/410) [`82ffb8a`](https://github.com/ofri-peretz/eslint/commit/82ffb8ae4e6bb351af829643af5eaeaf615a79ee) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `require-guards` reported the wrong CWE at the wrong severity on every finding.

  It declared `CWE-284` at CVSS `9.8` (CRITICAL). Both were wrong.
  [CWE-284](https://cwe.mitre.org/data/definitions/284.html) is a **Pillar**, and
  MITRE marks it **Discouraged** for mapping real vulnerabilities — its own
  guidance says the name "is often misused in low-information vulnerability
  reports". And `9.8` requires `C:H/I:H/A:H` at once, which one missing guard does
  not produce: an unguarded route that reads scores 7.5
  (`AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`) and one that mutates also scores 7.5
  (`C:N/I:H/A:N`).

  - `missingGuards`, `emptyGuards` — now `CWE-306` (Missing Authentication for
    Critical Function; Base, mapping Allowed) at CVSS 7.5, HIGH.
  - `missingRequiredGuard` — now `CWE-862` (Missing Authorization) at CVSS 6.5,
    MEDIUM. It is a different weakness: the route _is_ guarded, so authentication
    runs and only a required policy guard is absent, which also means the caller
    needs privileges to reach it (`PR:L`, not `PR:N`).

  No detection behaviour changes — same findings, honest labels. Reporting every
  finding as CRITICAL left nothing to say when something genuinely is.

- [#421](https://github.com/ofri-peretz/eslint/pull/421) [`08ffa79`](https://github.com/ofri-peretz/eslint/commit/08ffa7979c935f4dfa4b3a265fc9547ae2d1161d) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - `require-guards` recognises an in-handler check against a configured secret

  The sibling of the existing `@Headers('…secret')` webhook exemption, one step
  further in: some handlers take the credential as a query or route parameter and
  compare it against the environment themselves.

  ```ts
  if (this.configService.get<string>('FEATURE_TOKEN') !== token) {
    return false;
  }
  ```

  That is amplication's `user.controller.ts:19`, reported as an unguarded route
  while it authenticates on its first statement.

  Only equality against a secret _source_ clears a route, and the name has to
  look like a credential: `process.env.CRON_SECRET`, `config.get('API_TOKEN')`.
  `process.env.NODE_ENV !== 'production'` is a feature flag and still reports —
  otherwise a handler could switch its own access control off by inspecting its
  environment. The comparison must also be in the handler itself, not inside a
  callback it passes along.

  Comparing already-trusted data (`req.user.role !== 'admin'`) is authorization,
  not authentication, and still reports; so does reading config without comparing
  it.

## 2.1.1

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

## 2.1.0

### Minor Changes

- [#380](https://github.com/ofri-peretz/eslint/pull/380) [`bd5c5ea`](https://github.com/ofri-peretz/eslint/commit/bd5c5ea3c4fb12e3fd96e30142e87dfc74837a12) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - New rule **`no-hybrid-app-config-loss`** (CWE-284), and an honest severity for
  permissive CORS.

  ### `no-hybrid-app-config-loss` — the gap the plugin was missing

  A hybrid application serves HTTP _and_ a microservice transport from one
  process, and the two do not share configuration. Without
  `inheritAppConfig: true`, every global pipe, guard, interceptor and filter
  registered on the HTTP app is **absent** from the microservice's message
  handlers — so an app whose routes are validated and guarded has a second entry
  surface, reading from Kafka or RabbitMQ, that is neither. Nothing in the code
  says so, and it survives review because both halves look correct on their own.

  **11 call sites in real application code across 4 repositories, and
  `inheritAppConfig` appears zero times.** Every hybrid application measured is in
  the failing state; the flag's only occurrences anywhere are inside NestJS's own
  framework and tests.

  Abstains where the absence is not provable: a spread, hybrid options built
  elsewhere, or a non-literal flag value. Reports `inheritAppConfig: false`,
  because that states the absence outright.

  Deliberately ungated. A draft reported only where the project scan found a
  global pipe or guard, but that silences on the _absence_ of evidence — a project
  whose layout the scan cannot read would look clean. A security rule that
  switches itself off scores a perfect false-positive rate while protecting
  nothing. The gate also changed no answer on any of the 11 sites, so it bought a
  failure mode and nothing else.

  ### `no-permissive-cors` severity now matches its own reasoning

  The rule documented that a wildcard matters _only_ with `credentials: true` —
  that is why `origin: ['*']` is treated as valid — and then rated every
  wildcard HIGH / CVSS 7.5 anyway. All 12 corpus findings are wildcards without
  credentials.

  A wildcard is not a valid `Access-Control-Allow-Origin` for a credentialed
  response, so the browser blocks the _script_ from reading an authenticated
  cross-origin response. The request itself still reaches the server and still has
  its side effects — a wildcard is not a CSRF control, and this severity change
  does not claim it is. `defaultOrigin` and `wildcardOrigin` are now MEDIUM / CVSS
  5.3 and say why. `reflectedOrigin` stays HIGH / 8.1: `origin: true` echoes the
  request Origin and _does_ stay valid with credentials, which is the case that
  actually leaks authenticated responses.

  663 tests, 100% statements / branches / functions / lines.

  ### `no-missing-validation-pipe` is now optionally type-aware

  With `parserOptions.project` configured, the rule answers a question it could
  not before: **does the DTO this `@Body()` is typed as actually declare any
  validation?** A DTO with no `class-validator` decorators means the pipe runs and
  enforces nothing, so every property of the request body passes through.

  This is the exposure `require-class-validator` existed for. That rule was
  deleted because the question — "is this class inbound, and is it validated?" —
  lives in whichever file declares the DTO, so a syntax-only rule had to guess
  from the class name. The checker reaches the declaration, and reaches each
  decorator's _origin_: `@IsString()` from `class-validator` counts, and
  `@ApiProperty()` — which documents a shape without enforcing it — does not,
  whatever either is named.

  Type information stays optional. Without it the rule behaves exactly as before.

  ### `no-res-bypass-serialization` respects a declared content type

  A handler that sets `content-type: application/xml` or `text/html` is writing a
  document, not a DTO — `ClassSerializerInterceptor` produces JSON, so there is no
  `@Exclude()` for it to have dropped. Found on a fourth corpus: ghostfolio's
  sitemap controller declares XML and sends an interpolated document.

### Patch Changes

- Updated dependencies [[`6f5f164`](https://github.com/ofri-peretz/eslint/commit/6f5f164c7461d66f17689039d19fa9d7d84111ef), [`5980f89`](https://github.com/ofri-peretz/eslint/commit/5980f89a65113e43d504ecc72a86d61aa1e522cb), [`81acd9c`](https://github.com/ofri-peretz/eslint/commit/81acd9ca270940529b455fbfa685b842b8cfe982), [`8e238ea`](https://github.com/ofri-peretz/eslint/commit/8e238ea3a7f18aa47c6d02368c6023d8575deca4), [`0cbcc46`](https://github.com/ofri-peretz/eslint/commit/0cbcc46f89258c888de7354cf24b90c316df43b0)]:
  - @interlace/eslint-devkit@1.9.0

## 2.0.2

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

## 2.0.1

### Patch Changes

- [#364](https://github.com/ofri-peretz/eslint/pull/364) [`86baa02`](https://github.com/ofri-peretz/eslint/commit/86baa026485bf93d63f1523d6eb382e0a40cbb3f) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Add the ecosystem and oxlint marks to the README logo row. Each plugin now
  leads with Interlace -> its ecosystem (node, nestjs, express, react, mongodb,
  postgresql, mysql, sqlite, prisma, drizzle, knex, typeorm, sequelize, lambda,
  vercel, jwt) -> oxlint -> ESLint; the generic quality plugins carry the row
  without an ecosystem mark. README-only change - no rule behaviour is affected.
  The patch bump is what carries the new README onto npm, which only refreshes a
  package README on publish.

## 2.0.0

### Major Changes

- [#336](https://github.com/ofri-peretz/eslint/pull/336) [`e190212`](https://github.com/ofri-peretz/eslint/commit/e19021265702cd51d09e55194211bd3c34562754) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Two rules removed, two added, and every remaining rule narrowed against a
  32,251-file corpus. **The plugin reports 55 errors where it used to report
  3,955 findings, and nothing true was lost.**

  **Breaking:** `require-class-validator` and `no-exposed-debug-endpoints` are
  gone; `no-res-bypass-serialization` and `no-unguarded-swagger` join
  `recommended` at `warn`. Every other rule got materially narrower. Nothing got
  broader.

  ### Removed — 10 rules to 8
  - **`no-exposed-debug-endpoints`** — **0 findings across 401 controller files**
    in both corpora. 311 lines, 5 options and 2 name lists to detect nothing. Its
    one real case, an unguarded admin route, is already `require-guards`.
  - **`require-class-validator`** — 317 findings, 72% of every warning emitted.
    It has to answer "is this class inbound?", and the evidence for that — being
    the declared type of a `@Body()` parameter — lives in another file. Two of its
    six worst files were categories that should never have been in scope: an
    outbound response base class and a CQRS command. It had grown 8 name-based
    lists and 5 options, and it is redundant with
    `require-validation-pipe-whitelist`, which covers the same risk with a
    decidable fact: with `whitelist: true` an undecorated property is stripped and
    never arrives. One finding per application beats one guess per property.

  ### New rules
  - **`no-unguarded-swagger`** (CWE-200) — `SwaggerModule.setup()` straight-line
    in a bootstrap publishes every route, DTO shape and auth scheme to anonymous
    callers. Reports only where the whole bootstrap is visible; abstains on any
    conditional and on the `setupSwagger(app)` helper shape, which is guarded at
    a call site in another file. 9 unsafe of 16 sites, 4 repositories.
  - **`no-res-bypass-serialization`** (CWE-200) — `@Res()` without
    `passthrough: true` stops every interceptor, so `ClassSerializerInterceptor`
    never runs and `@Exclude()` silently stops applying. Reported only when the
    handler writes a non-literal body; streams, redirects and status literals have
    nothing to serialize.

  ### `require-guards`: 94 findings to 14, ~10% precision to ~70%

  Triaged one by one. Nine of the original 94 were real. Every false class was a
  legitimate authentication mechanism the rule could not see:

  - **No authentication system at all (-38).** "You forgot a guard" only means
    something where guards are the mechanism. 38 findings were NestJS's own
    `sample/*` apps; only `19-auth-jwt` of 25 declares an auth dependency.
    Silence requires the manifest _and_ the module scan to come up empty, so an
    unreadable manifest or a hand-rolled `CanActivate` keeps the rule reporting.
  - **Auth applied as middleware (-20).** The canonical RealWorld NestJS app
    authenticates through `configure(consumer).apply(AuthMiddleware).forRoutes()`
    with no `@UseGuards` anywhere, and the rule reported all 20 of its routes. The
    project scan now reads those registrations.
  - **The `nest new` scaffold (-15).** `@Controller()` + `@Get()` + a handler
    taking nothing is `GET /`. `@Controller(ADMIN_PREFIX)` is still reported —
    the test is _no argument_, not _no readable path_.
  - **Qualified auth entry points (-7).** `auth0Login`, `githubCallback`,
    `awsMarketplaceCallback`. Matched on the trailing token only, so
    `getLoginHistory` stays in scope.
  - **Signature-verified webhooks.** A handler taking `@Headers('…-secret')` is
    authenticating the way Stripe, GitHub and Stigg document.
  - **Password recovery and activation.** Matched as a combination — "password"
    plus a recovery verb — rather than as four more list entries.

  What survives earns the severity: awesome-nest-boilerplate carries `@Auth` on
  three `PostController` handlers and none on `@Put(':id')` or `@Delete(':id')`;
  nestjs-starter-rest-api has two routes whose own comment says
  `// TODO: ADD RoleGuard`.

  ### `no-exposed-private-fields`: 58 to 37

  `@ObjectType()` shared a set with `@Entity`, and that set was checked _before_
  the credential-delivery name check — so `@ObjectType() class ApiKeyToken`
  short-circuited into scope and twenty's whole auth DTO directory was reported
  for carrying the token it exists to return. Persistence still outranks a name;
  transport does not. `@HideField()` now counts as an exclusion, as it should.
  ORM projection (`select: false`, `hidden: true`) is accepted as exclusion too.

  ### `no-permissive-cors`

  Extended to `NestFactory.create({ cors })`. Nest routes a non-object `cors`
  option into the same `enableCors()` this rule already watched, so `{cors: true}`
  **is** `Access-Control-Allow-Origin: *` — 7 unsafe sites across 3 repos,
  including amplication's code-generator template, which emits the flaw into every
  service it produces. `origin: ['*']` is _not_ reported: the `cors` package
  compares array entries with `===`, so a literal `'*'` in an array denies rather
  than allows.

  ### Decorators are classified by import origin, not by name

  The module a binding came from is a fact in the AST, and it is what a decorator
  _is_. A decorator from `@nestjs/graphql`, `typeorm` or `@nestjs/swagger` is not
  access control whatever it is named; one from a project module like
  `src/middleware/auth.guard` is, with no name recognition needed. Naming
  conventions are only a fallback for project-local modules whose role cannot be
  resolved.

  This is what makes the plugin survive the wrapper pattern every real codebase
  uses — `@Authenticated` (immich), `@Auth` (awesome-nest-boilerplate),
  `@RequireAuthentication` (novu) — and it stops `@ApiBearerAuth()` being read as
  enforcement when it only documents a scheme.

  ### Also
  - Options with array defaults no longer declare them in the schema. ESLint
    validates with Ajv in `useDefaults` mode, so a schema default is written into
    the options object the moment a config passes `{}` — which made
    `['error', {}]` behave differently from `['error']` and report
    `POST /auth/login`.
  - `no-missing-validation-pipe` reports only shapes no `ValidationPipe` can
    validate (missing annotation, `any`, `unknown`, `object`, inline type
    literals). The previous strict behaviour is available via
    `requireExplicitPipe: true`.
  - `require-throttler` targets unauthenticated sensitive routes only, making it
    the complement of `require-guards` rather than an overlap. Its route matching
    is now token-aligned: `'authors'.includes('auth')` and
    `'tokenize'.includes('token')` are both true, so an author listing was being
    told to rate-limit itself. A sensitive token still counts in any position, so
    `verifyEmail` and `resendVerifyEmail` remain in scope.
  - `no-missing-validation-pipe` no longer skips a whole file when a global
    `ValidationPipe` is registered. A global pipe is evidence about typed DTOs and
    nothing else — it has no metatype for `any`, `unknown`, `object`, a type
    literal or an unannotated parameter, and passes those through exactly as a
    local pipe would. It also accepts any parameter-scoped pipe rather than one
    literally named `ValidationPipe`, since `@Param('id', UserByIdPipe)` resolves
    and throws; the built-in `Parse*Pipe` family is excluded because it coerces a
    scalar and cannot check a DTO's shape.

  ### Tests

  629 tests at 100% statement / branch / function / line coverage, including a
  detection contract (every rule must still fire on the vulnerability it exists
  for, and stay silent on the minimally-different safe twin) and regression locks
  pinning exact findings for shapes taken from the measured codebases.

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

## 1.4.0

### Minor Changes

- [#327](https://github.com/ofri-peretz/eslint/pull/327) [`d2a24c6`](https://github.com/ofri-peretz/eslint/commit/d2a24c66893740d06186225ef93aa624824c8bd9) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Two new rules, both in `recommended` at `error`: `no-permissive-cors` and
  `require-validation-pipe-whitelist`.

  They were chosen by measurement, not intuition. Scanning five real NestJS
  applications (lujakob/nestjs-realworld-example-app, notiz-dev/nestjs-prisma-starter,
  squareboat/nestjs-boilerplate, ack-nestjs-boilerplate, brocoders/nestjs-boilerplate)
  for candidate patterns produced two with a high defect rate and a narrow,
  statically-decidable signature:

  **`require-validation-pipe-whitelist` (CWE-915).** Three of the five used a bare
  `new ValidationPipe()`. Without `whitelist: true` the pipe validates the properties
  the DTO declares and keeps the ones it doesn't, so `{ …, "isAdmin": true }` passes
  validation with `isAdmin` still attached and any `save(dto)` downstream carries it
  into the record. The existing `no-missing-validation-pipe` asks whether a pipe
  exists; this asks whether the pipe strips anything.

  **`no-permissive-cors` (CWE-942).** Both CORS call sites in the corpus were
  permissive — one bare `enableCors()` (defaults to `*`) and one
  `enableCors({ origin: true })`. The second is the subtle one: it reflects the
  request's own `Origin` header back, so every site passes, and unlike `'*'` it
  stays valid with `credentials: true`, letting any page read authenticated
  responses.

  Precision was verified against the same corpus: **6 findings, 6 true positives,
  0 false positives.** Both mature boilerplates (ack, brocoders) come back clean —
  brocoders imports its `validationOptions` from another module, and the rule
  deliberately does not resolve across files rather than guess. Anything not
  statically decidable is left alone: config lookups, callbacks, imported options
  objects, and objects with a spread that could supply the missing key.

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

## 1.3.0

### Minor Changes

- [#287](https://github.com/ofri-peretz/eslint/pull/287) [`5184a12`](https://github.com/ofri-peretz/eslint/commit/5184a1299e2d69f7c9ecbb721a92a543f30af2ce) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Eliminate the false-positive storm on real NestJS codebases. Scanning two
  popular boilerplates with `recommended` produced 582 findings on
  ack-nestjs-boilerplate and 109 on brocoders/nestjs-boilerplate; after this
  change they produce 0 and 11, and every remaining finding is a genuine gap
  (an unauthenticated file-download route, entities exposing `password`/`hash`,
  unvalidated request-DTO properties, and one missing `ThrottlerModule`).

  - **Cross-file global registration is now detected.** Guards, pipes and rate
    limiting registered through DI (`{ provide: APP_GUARD | APP_PIPE |
APP_INTERCEPTOR, ... }`), through `app.useGlobalPipes()` /
    `app.useGlobalGuards()`, or through `ThrottlerModule.forRoot(Async)` suppress
    the corresponding per-controller findings. The project root is resolved from
    the linted file and its module files are scanned once and cached. A
    `ThrottlerGuard` registered as `APP_GUARD` counts as rate limiting, not
    authentication. Opt out per rule with `detectGlobalGuards` /
    `detectGlobalPipes: false`.
  - **`require-guards`** no longer asserts "unguarded" on a route carrying a
    decorator it cannot resolve — projects wrap `@UseGuards` in composites such as
    `@AuthJwtAccessProtected()` via `applyDecorators()`. It also stops reporting
    credential-issuing routes (`login`, `register`, `forgotPassword`,
    `resetPassword`, `confirmEmail`, `refresh`, health checks, webhooks), which
    cannot require the credential they hand out. New options:
    `allowCustomDecorators`, `detectGlobalGuards`, `publicRoutePatterns`.
    `requiredGuards` — documented since 1.0 but never read — is now actually
    enforced: with it set, `@UseGuards(RolesGuard)` no longer satisfies
    `requiredGuards: ['JwtAuthGuard']`, and the new `missingRequiredGuards`
    message names the guards that would. Guard arguments are read syntactically
    (`AuthGuard('jwt')`, `guards.JwtAuthGuard`); anything with no static name,
    an unresolved composite decorator, or a global `APP_GUARD` still suppresses
    the report, since none of them can be proven _not_ to apply the guard.
  - **`require-throttler` now reports once per project, on the root module**,
    instead of once per route handler. Rate limiting is adopted with a single
    `ThrottlerModule` registration, so 24 (and 93) per-route errors described a
    one-line fix. New options: `rootModuleNames`, `rootModuleFiles`; `skipRoutes`
    is deprecated and ignored. In-file detection requires an actual registration
    (`ThrottlerModule` in `imports`, or a `ThrottlerGuard` behind `APP_GUARD`) —
    a bare `import { ThrottlerGuard }` no longer silences the rule.
  - **`no-missing-validation-pipe`** honours parameter-bound pipes
    (`@Body(new ValidationPipe())`, `@Param('id', ParseIntPipe)`) and globally
    registered pipes.
  - **`require-class-validator`** no longer fires on response/serialization DTOs
    (name pattern, superclass name, or class-transformer `@Expose`/`@Exclude`),
    on `format: 'binary'` multipart upload slots, or on `@Allow()`-marked
    properties, and recognises ~40 more class-validator decorators. New options:
    `checkResponseDtos`, `responseDtoPattern`.
  - **`no-exposed-private-fields`** is scoped to persistence entities and domain
    models. A `LoginResponseDto` carrying a token is a declared contract; an
    `@Entity()` exposing `password` without `@Exclude()` is an accident. New
    option: `includeDtos` restores the previous behaviour. GraphQL `@InputType()`
    / `@ArgsType()` classes follow `includeDtos` too — they are request contracts
    (`LoginInput` must carry a password); `@ObjectType()` stays an entity.
  - **`no-exposed-debug-endpoints`** inspects route paths only, instead of every
    string literal in the file (it was flagging enum members, seed data and config
    values). `admin`, `test` and `health` are no longer default debug paths, and a
    guarded debug route is no longer reported. New option: `detectGlobalGuards`.

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

## 1.2.6

### Patch Changes

- [#269](https://github.com/ofri-peretz/eslint/pull/269) [`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - docs: dual-logo README header (Interlace mark + ESLint mark side by side) and closing Interlace footer — refreshes the README rendered on npmjs.com. No runtime changes.

- Updated dependencies [[`7028fe2`](https://github.com/ofri-peretz/eslint/commit/7028fe2668a42266d831014184dcef70e73101ad)]:
  - @interlace/eslint-devkit@1.4.2

## 1.2.5

### Patch Changes

- [#252](https://github.com/ofri-peretz/eslint/pull/252) [`d67e395`](https://github.com/ofri-peretz/eslint/commit/d67e3953c2748ad36e6aebe0f24b1d04e518b4d0) Thanks [@ofri-peretz](https://github.com/ofri-peretz)! - Fix Codecov badge showing "unknown" — switch from flag to component URL format

## 1.2.4

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

This was a version bump only for eslint-plugin-nestjs-security to align it with other projects, there were no code changes.

# Changelog

All notable changes to `eslint-plugin-nestjs-security` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-29

### Added

#### Authorization & Access Control Rules (2)

- `require-guards` - Require @UseGuards decorator on controllers/handlers (CWE-284)
- `no-exposed-private-fields` - Detect exposed sensitive fields in DTOs/entities (CWE-200)

#### Input Validation Rules (2)

- `no-missing-validation-pipe` - Require ValidationPipe for DTO parameters (CWE-20)
- `require-class-validator` - Require class-validator decorators on DTO properties (CWE-20)

#### Rate Limiting & DoS Rules (1)

- `require-throttler` - Require ThrottlerGuard/@Throttle for rate limiting (CWE-770)

#### Presets (2)

- `recommended` - Balanced security defaults
- `strict` - All 5 rules as errors

#### Features

- LLM-optimized error messages with CWE references
- OWASP Top 10 2021 alignment (A01, A03, A05)
- Decorator-aware detection (@UseGuards, @UsePipes, @Throttle, @Exclude)
- `assumeGlobal*` options for teams using global configuration
- Support for public/skip decorators (@Public, @SkipAuth, @AllowAnonymous, @SkipThrottle)
- TypeScript support
- Comprehensive test coverage (79 tests, 96.09% line coverage)

### Security

- Covers 4 CWEs: 20, 200, 284, 770
- Maps to OWASP Top 10 2021: A01, A03, A05
