---
'eslint-plugin-nestjs-security': major
---

One new rule, a large false-positive reduction, and an AST-based rewrite of
decorator classification.

**Breaking:** `recommended` gains `no-res-bypass-serialization` at `warn`
alongside the two `error`-level rules already added in #327. More importantly,
`require-class-validator` changes what it considers in scope (see below), and
several rules got materially narrower. Every rule got _narrower_, never broader.

### New rule

- **`no-res-bypass-serialization`** (CWE-200) — `@Res()` without
  `passthrough: true` stops every interceptor, so `ClassSerializerInterceptor`
  never runs and `@Exclude()` silently stops applying. Reported only when the
  handler writes a non-literal body; streams, redirects and status literals have
  nothing to serialize.

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

### GraphQL input types are out of scope by default

`require-class-validator` no longer reports `@InputType()` / `@ArgsType()`
classes. The GraphQL schema already enforces scalar types and nullability on
every input field, so the type-confusion the rule guards against is handled
before a resolver runs; what class-validator adds there is semantic validation
(length, format, enum), which is a separate, opt-in claim. This was **1,449 of
1,773** findings across the measured codebases, overwhelmingly generated
`*WhereInput` filter classes. Enable `checkGraphqlInputs: true` to report them.

### New options

`authDecorators`, `publicRoutes`, `validatorDecorators`, `checkGraphqlInputs`,
`requireExplicitPipe`, `onlySensitiveRoutes`, plus `skipRoutes` and
`requiredGuards`, which were declared but not honoured before.

### Tests

581 tests at 100% statement / branch / function / line coverage, including a
detection contract (every rule must still fire on the vulnerability it exists
for, and stay silent on the minimally-different safe twin) and a regression lock
pinning exact findings for shapes taken from the measured codebases.
