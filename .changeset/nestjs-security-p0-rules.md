---
'eslint-plugin-nestjs-security': major
---

Two rules removed, two added, and every remaining rule narrowed against a
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
