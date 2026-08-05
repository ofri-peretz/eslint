---
'eslint-plugin-nestjs-security': minor
---

New rule **`no-hybrid-app-config-loss`** (CWE-284), and an honest severity for
permissive CORS.

### `no-hybrid-app-config-loss` — the gap the plugin was missing

A hybrid application serves HTTP *and* a microservice transport from one
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
global pipe or guard, but that silences on the *absence* of evidence — a project
whose layout the scan cannot read would look clean. A security rule that
switches itself off scores a perfect false-positive rate while protecting
nothing. The gate also changed no answer on any of the 11 sites, so it bought a
failure mode and nothing else.

### `no-permissive-cors` severity now matches its own reasoning

The rule documented that a wildcard matters *only* with `credentials: true` —
that is why `origin: ['*']` is treated as valid — and then rated every
wildcard HIGH / CVSS 7.5 anyway. All 12 corpus findings are wildcards without
credentials.

Browsers refuse to send credentials to a wildcard, so those cases cannot expose
authenticated data. `defaultOrigin` and `wildcardOrigin` are now MEDIUM / CVSS
5.3 and say why. `reflectedOrigin` stays HIGH / 8.1: `origin: true` echoes the
request Origin and *does* stay valid with credentials, which is the case that
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
decorator's *origin*: `@IsString()` from `class-validator` counts, and
`@ApiProperty()` — which documents a shape without enforcing it — does not,
whatever either is named.

Type information stays optional. Without it the rule behaves exactly as before.

### `no-res-bypass-serialization` respects a declared content type

A handler that sets `content-type: application/xml` or `text/html` is writing a
document, not a DTO — `ClassSerializerInterceptor` produces JSON, so there is no
`@Exclude()` for it to have dropped. Found on a fourth corpus: ghostfolio's
sitemap controller declares XML and sends an interpolated document.
