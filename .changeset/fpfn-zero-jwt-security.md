---
'eslint-plugin-jwt-security': minor
---

fix(jwt-security): close every deferred FP/FN — value flow, cross-file NestJS modules, provenance, no name heuristics

Fixes the seven items the 2026-10 audit had deferred (benchmarks/audits/2026-10-10-fp-fn-jwt-security.md), which now lists no deferrals.

**Value following within a file.** Options, keys and payloads are followed through a `const` or a never-reassigned `let`, a destructure, a member of an object literal, a spread, an `await`, a cast, and the single `return` of a same-file function — bounded, cycle-guarded, and silent on what it cannot read. `const config = { secret: 'abc' }; jwt.sign(p, config.secret)` is now a hardcoded secret.

**Injected members need evidence.** `this.<member>.sign()` / `.verify()` is a JWT call only when the class shows it: a type annotation resolving to a JWT library, an `@Inject(X)` of a JWT import, or an assignment from one. An untyped `constructor(private readonly hashing)` is no longer assumed to be a JWT client.

**Per rule.**

- `no-algorithm-confusion` no longer decides a key is public from its NAME. Evidence is structural: a PEM public key, `createPublicKey()`, jose's `importSPKI` / `createRemoteJWKSet`, a jwks-rsa signing key, a `.pub` file read. Mixed HS*/asymmetric whitelists are still reported for any key.
- `require-issued-at` no longer reports `noTimestamp: true`; `no-timestamp-manipulation` owns it.
- `no-timestamp-manipulation` has a new `maxClockToleranceSeconds` option (default 300) and reports a numeric `clockTolerance` above it.
- `require-expiration` reads the package's `JwtModule.register` / `registerAsync` (in `*.module.ts`, cross-file) for a NestJS `sign(payload)`, and reports when no registration sets `signOptions.expiresIn`.
- `no-sensitive-payload` reports a spread of an object it cannot see into the claims (`{ ...user }`, a DB row) as whole-record exposure (CWE-200). With type information it reports only when the spread's type declares a sensitive field.
- `no-decode-without-verify` exempts a decoded token only on back-channel provenance (a `fetch()` response body, an axios/got/ky/undici response, an openid-client grant) instead of field and variable names. `data.id_token` from `await request.json()` is now reported.

**Upgrade notes.**

- New findings: whole-record spreads, `clockTolerance` above 300 s, NestJS modules without `expiresIn`, and decodes of tokens whose back-channel origin is not in the file. A decode that is safe for reasons the rule cannot see can say so with `@verified-separately`.
- Findings that disappear: name-only "public" keys, `noTimestamp: true` from require-issued-at, and untyped injected members.
