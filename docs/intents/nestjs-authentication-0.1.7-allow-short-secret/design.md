# Design — Report the `allowShortSecret` opt-in of `@nestjs/authentication`

Intent: [`intent.md`](./intent.md). **Status:** approved.

---

## Requirements

- R1. `allowShortSecret: true` (a `true` literal) in an options object passed
  to `new JwtSigner(...)`, `new JwtVerifier(...)`, `new JwtBearerProvider(...)`
  or `super(...)` of a class extending `JwtBearerProvider`, or in the
  `accessToken` property of `AuthenticationModule.forRoot(...)`, all imported
  from `@nestjs/authentication`, is reported once, on the property.
- R2. When the same object's `key` is a string literal shorter than 32 bytes,
  the report names its length; the existing length rules of the rule decide
  bytes (hex, base64, utf-8) as they do today.
- R3. `allowShortSecret: false`, a non-literal value, a spread, or the same
  property on a call not imported from `@nestjs/authentication` is not
  reported.
- R4. A new rule option `allowNestAuthShortSecret` (default `false`) turns R1
  off for a project that must keep a shared secret.
- R5. Nothing changes for `jsonwebtoken`, `jose` or `@nestjs/jwt` call sites.

## Design

One new branch in `packages/eslint-plugin-jwt-security/src/rules/no-weak-secret/index.ts`:

1. Collect the local names bound by `import { JwtSigner, JwtVerifier,
JwtBearerProvider, AuthenticationModule } from '@nestjs/authentication'`
   (aliases included).
2. On a `NewExpression` / `CallExpression` whose callee resolves to one of
   them (or `AuthenticationModule.forRoot`, reading its `accessToken`
   property), read the first argument when it is an `ObjectExpression`.
3. Report on `allowShortSecret` when its value is the literal `true` (R1), with
   messageId `nestAuthShortSecret`:
   `new JwtSigner({ key, allowShortSecret: true })` → "allowShortSecret lets
   an HMAC secret under the hash's size through; anyone holding a token can
   guess it offline". Fix text: "Generate a new secret with
   `openssl rand -base64 32`, rotate the services that share it, then remove
   allowShortSecret".
4. When `key` is a string literal, append its byte length (R2).

Reports added: the R1 report, e.g. `AuthenticationModule.forRoot({ accessToken: { key, allowShortSecret: true } })`.
Reports removed: none.

Quint model `benchmarks/suites/fidelity/models/jwt-security/no_weak_secret.qnt`
gains a dimension `nestAuthOptIn ∈ {absent, true, false, nonLiteral}` crossed
with `importedFrom ∈ {nestAuth, other}` and `ruleOption ∈ {on, off}`; the
`.cjs` driver renders each into a fixture.

Tests: the intent's fixture as `invalid`; R3's four shapes as `valid`; R4 as a
`valid` case with the option; R5 pinned by the existing suite.

## Verification

- `npx vitest run --config vitest.config.mts src/rules/no-weak-secret` in
  `packages/eslint-plugin-jwt-security`: red on the fixture before the change.
- `npm run fidelity -- jwt-security/no_weak_secret` and the mutation run named
  in the intent.

## Rejected alternatives

- A new rule in `eslint-plugin-nestjs-security`: the finding is about a JWT
  secret, and `jwt-security/no-weak-secret` already owns CWE-326 secret length
  for every other JWT library.
- Reporting every `key` of `@nestjs/authentication` read from the environment:
  its length is unknown in source, and the package already refuses a short one
  at startup unless the opt-in is set.

## Out of scope

- Secrets read through `ConfigService` or a factory (`forRootAsync`): the
  value is not in source.
- `PasswordResetHandler.hashPassword()` (nestjs/authentication#117): a weak
  hash inside it is already reported by `node-security`'s weak-hash rules, and
  an identity function is not a pattern seen in code.
