---
'eslint-plugin-nestjs-security': major
---

Three new rules, a large false-positive reduction, and an AST-based rewrite of
decorator classification.

**Breaking:** `recommended` gains two rules at `error`
(`require-validation-pipe-whitelist`, `no-permissive-cors`) and one at `warn`
(`no-res-bypass-serialization`). `validation` gains
`require-validation-pipe-whitelist` at `error`. Existing projects can see new
errors on upgrade — `require-validation-pipe-whitelist` fires in 6 of 9 real
NestJS codebases measured. Every existing rule got _narrower_, never broader.

### New rules

- **`require-validation-pipe-whitelist`** (CWE-915) — a `ValidationPipe` without
  `whitelist: true` forwards properties the DTO never declared, so a request can
  set fields the DTO does not mention and `repository.save(dto)` writes them. A
  second message covers `forbidNonWhitelisted: true` without `whitelist`, which
  does nothing on its own.
- **`no-res-bypass-serialization`** (CWE-200) — `@Res()` without
  `passthrough: true` stops every interceptor, so `ClassSerializerInterceptor`
  never runs and `@Exclude()` silently stops applying. Reported only when the
  handler writes a non-literal body; streams, redirects and status literals have
  nothing to serialize.
- **`no-permissive-cors`** (CWE-942) — a wildcard or reflected origin combined
  with `credentials: true`. A wildcard _without_ credentials is deliberately not
  reported: browsers refuse to send cookies to it, so it is a public API rather
  than a vulnerability. Function `origin` callbacks are never reported — that is
  the documented allow-list pattern.

### Decorators are classified by import origin, not by name

The module a binding came from is a fact in the AST, and it is what a decorator
_is_. A decorator from `class-validator` validates whatever it is named; one
from `@nestjs/graphql`, `typeorm` or `@nestjs/swagger` does not, whatever it is
named; one from a project module like `src/middleware/auth.guard` is access
control with no name recognition needed. Naming conventions are now only a
fallback for project-local modules whose role cannot be resolved.

This removed whole false-positive classes: bare `@Field()` from `@nestjs/graphql`
was being read as a validator (175 findings on one codebase's entity layer), and
`@ApiBearerAuth()` from `@nestjs/swagger` was being read as enforcement when it
only documents a scheme.

### False positives

Measured across ten high-star NestJS codebases (5,488 files): **3,955 → 596
findings**. Notable fixes:

- Public-by-design routes (`login`, `register`, `refresh`, `callback`,
  `webhook`, health probes) no longer require a guard; matching is per path
  segment, so `/admin/login-attempts` is still private.
- `no-missing-validation-pipe` now reports only shapes no `ValidationPipe` can
  validate (missing annotation, `any`, `unknown`, `object`, inline type
  literals). The previous strict behaviour is available via
  `requireExplicitPipe: true`.
- `require-throttler` targets unauthenticated sensitive routes only, making it
  the complement of `require-guards` rather than an overlap.
- `require-class-validator` distinguishes inbound DTOs from responses,
  persistence entities and entity mappers; providers (`@Injectable`,
  `@Controller`, `@Module`, `@Resolver`) are never DTOs, and `private` /
  `protected` members are never payload fields.
- `no-exposed-debug-endpoints` abstains when any decorator it does not
  recognise is present, rather than asserting a guarded route is open.
- `no-exposed-private-fields` no longer flags boolean flags (`isSecret`) or
  credential-delivery responses (`RefreshResponseDto.refreshToken`).

### New options

`authDecorators`, `publicRoutes`, `validatorDecorators`, `requireExplicitPipe`,
`onlySensitiveRoutes`, plus `skipRoutes` and `requiredGuards`, which were
declared but not honoured before.

### Tests

513 tests at 100% statement / branch / function / line coverage, including a
detection contract (every rule must still fire on the vulnerability it exists
for, and stay silent on the minimally-different safe twin) and a regression lock
pinning exact findings for shapes taken from the measured codebases.
