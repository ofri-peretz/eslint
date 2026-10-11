---
'eslint-plugin-jwt-security': minor
---

fix(jwt-security): resolve options structurally, read NestJS/jose/config APIs, skip non-JWT sign/verify calls

Fixes 22 of the 29 false-positive and false-negative items found in the 2026-10 audit; the other 7 are deferred with reasons (benchmarks/audits/2026-10-10-fp-fn-jwt-security.md).

**Options are now resolved, not just read inline.** A same-file `const`, an `as` / `satisfies` cast and a spread of such a const are all followed. An options value that cannot be seen (a parameter, an import, a call) is now treated as opaque, and the "missing option" rules (`require-algorithm-whitelist`, `require-issuer-validation`, `require-audience-validation`, `require-max-age`, `require-expiration`) stay **silent** on it instead of reporting `jwt.verify(token, key, verifyOptions)` as having no options. `no-algorithm-none`, `no-algorithm-confusion` and `no-timestamp-manipulation` now see `'none'`, HS\* and `noTimestamp` inside those consts and casts.

**NestJS.** `JwtService.sign(payload, options)` / `verify(token, options)` take options as the second argument and merge them over `JwtModule` defaults. They are no longer reported as having no options. `signAsync` / `verifyAsync` are now matched, a literal `secret` in per-call options or in `JwtModule.register({ secret })` is reported, and so is `algorithm: 'none'` at the second argument.

**Secrets.** `no-hardcoded-secret` and `no-weak-secret` now catch `process.env.JWT_SECRET || 'secret'` (and `??`), a `const` byte key (`const key = new TextEncoder().encode('secret')`), jose's `new SignJWT(…).sign(key)`, and the config objects of express-jwt, passport-jwt and fast-jwt. A PEM **public** key or certificate is no longer reported as a hardcoded secret. Both rules now skip test files.

**Non-JWT calls.** A `createSign()` / `createVerify()` object from `node:crypto`, WebCrypto's `crypto.subtle`, a `const decoder = new TextDecoder()`, jose's `base64url.decode`, and a `this.<member>` whose declared type is imported from a non-JWT module (an injected `HashingService`) are no longer treated as JWT calls.

**Per rule.**

- `no-decode-without-verify` allows `const { exp } = jwtDecode(token)` and `decoded.header.kid` (the JWKS lookup), and the `allowHeaderInspection` option now actually works.
- `require-max-age` accepts jose's `maxTokenAge`. It no longer accepts `clockTolerance`, which widens the expiry window rather than capping token age.
- `no-timestamp-manipulation` reports `ignoreExpiration: true`.
- `no-algorithm-confusion` reports a whitelist that mixes HS\* with RS\*/ES\*/PS\*/EdDSA, whatever the key is called.
- `require-issued-at` no longer reports `noTimestamp: false`, and does report a jose `SignJWT` without `setIssuedAt()`.
- `no-sensitive-payload` reads a const payload, jose constructor claims and `passwordHash`-style fields.

**Upgrade notes.** You may see new findings for `ignoreExpiration: true`, `clockTolerance`-only verifies, mixed-family `algorithms` lists, jose builders without `setIssuedAt()`, fallback secrets, and the config-object APIs above.
