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
