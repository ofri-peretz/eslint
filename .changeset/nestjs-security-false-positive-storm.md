---
'eslint-plugin-nestjs-security': minor
---

Eliminate the false-positive storm on real NestJS codebases. Scanning two
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
- **`require-throttler` now reports once per project, on the root module**,
  instead of once per route handler. Rate limiting is adopted with a single
  `ThrottlerModule` registration, so 24 (and 93) per-route errors described a
  one-line fix. New options: `rootModuleNames`, `rootModuleFiles`; `skipRoutes`
  is deprecated and ignored.
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
  option: `includeDtos` restores the previous behaviour.
- **`no-exposed-debug-endpoints`** inspects route paths only, instead of every
  string literal in the file (it was flagging enum members, seed data and config
  values). `admin`, `test` and `health` are no longer default debug paths, and a
  guarded debug route is no longer reported. New option: `detectGlobalGuards`.
