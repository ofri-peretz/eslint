---
slug: nestjs-authentication-0.1.7-allow-short-secret
opened: 2026-11-22
packages:
  - eslint-plugin-jwt-security
cases: []
---

# Intent — Report the `allowShortSecret` opt-in of `@nestjs/authentication`

> Stage 1 artifact. Opened by the NestJS release watch on reading
> `@nestjs/authentication` 0.1.7.

**Status:** approved · **Opened:** 2026-11-22 · **Owner:** @ofri-peretz

---

## What is wanted

A code review sees it when a NestJS app turns off the minimum HMAC secret
length of `@nestjs/authentication`: `allowShortSecret: true` in the options of
`JwtSigner`, `JwtVerifier`, `JwtBearerProvider` or the `accessToken` option of
`AuthenticationModule.forRoot(...)` is reported by `jwt-security/no-weak-secret`
(CWE-326), and a short literal `key` next to it is reported with its length.
An app that must keep a secret other services already share silences it with
one rule option, and says so in its config.

## Why now

[`@nestjs/authentication` 0.1.7](https://github.com/nestjs/authentication/releases/tag/0.1.7)
ships nestjs/authentication#119 (commit 5ecc234), "accept an existing short
secret behind an explicit opt-in". Read at the tag:

- `lib/jwt/jws.util.ts` line 131: the minimum is the hash's size,
  `{ HS256: 32, HS384: 48, HS512: 64 }` bytes (RFC 7518 §3.2).
- line 148-156: `keyFits(alg, key, { allowShortSecret })` lowers that minimum
  to 1 byte when the option is set.
- lines 223-235: `warnShortSecret` logs one warning per process and secret:
  anyone holding a token can guess the secret offline and sign their own.
- `lib/jwt/jwt-signer.service.ts` lines 27-29 and 51, and
  `lib/jwt/jwt-verifier.service.ts` lines 52-54, 94 and 140: the signer, the
  verifier and `verifierForSigner()` all pass the option through.
- `lib/interfaces/jwt-options.interface.ts` lines 55 and 88: the option on
  `JwtVerifierOptions` and `JwtSignerOptions`, default `false`.

Before 0.1.7 a secret under 32 bytes failed at startup, so there was nothing
to lint. Now it runs. The fixture

```ts
import { AuthenticationModule } from '@nestjs/authentication';
AuthenticationModule.forRoot({
  accessToken: { key: process.env.JWT_SECRET, allowShortSecret: true },
});
const signer = new JwtSigner({ key: 'shortsecret', allowShortSecret: true });
```

gives **0 reports** with every rule of `eslint-plugin-jwt-security` and
`eslint-plugin-nestjs-security` at `error` (built plugins on this branch, flat
config, `@typescript-eslint/parser`).

## Affected users and systems

- `eslint-plugin-jwt-security`, rule `no-weak-secret`: users of
  `@nestjs/authentication` 0.1.7 or later.
- Real code: none of the NestJS repositories in the local corpus
  (`tmp/nest-corpus*`) imports `@nestjs/authentication` yet, so there is no
  real usage to read precision on.

## Constraints

- No new dependency.
- No decision from an identifier's name when an import fact is available: the
  options object is recognised only as an argument of `JwtSigner`,
  `JwtVerifier`, `JwtBearerProvider` or `AuthenticationModule.forRoot`
  imported from `@nestjs/authentication`.
- Type-unaware.
- No change to what `no-weak-secret` reports for `jsonwebtoken`, `jose` or
  `@nestjs/jwt`.

## Success criteria

- `npx vitest run --config vitest.config.mts` in
  `packages/eslint-plugin-jwt-security` passes at 100% coverage with the
  fixture above as an `invalid` case and `allowShortSecret: false` and a
  locally named `allowShortSecret` on an unrelated call as `valid` cases.
- `npm run fidelity -- jwt-security/no_weak_secret`: 0 failing, full domain
  coverage, with the new option dimension.
- `npm run mutation -- --plugin eslint-plugin-jwt-security --rules no-weak-secret`:
  0 survivors.

## Open questions

- Is a lint report worth adding on top of the package's own startup warning?
  The one use the package documents, a secret other services already sign or
  verify with, has no fix but a suppression, and with no real code using the
  option yet its precision cannot be read, which the release watch requires
  before a new report class ships. Accept, and this is built as designed;
  reject, and this intent is closed with that reason.
