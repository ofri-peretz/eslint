---
'eslint-plugin-jwt-security': minor
---

feat: cover jose's JWS-level verify entry points

`compactVerify`, `flattenedVerify` and `generalVerify` were not recognised as
verification calls. All three verify a signature using whatever algorithm the
token header names unless `algorithms` is passed, which is the substitution
attack this plugin exists to catch — and the published API-surface coverage
figure said 100% while none of the three appeared anywhere in the rule sources,
because that figure was a hand-typed constant rather than a measurement.

They are now seen by the five rules that genuinely apply to a JWS:
`require-algorithm-whitelist`, `no-algorithm-confusion`, `no-algorithm-none`,
`no-hardcoded-secret` and `no-weak-secret`.

They are deliberately NOT seen by `require-audience-validation`,
`require-issuer-validation` or `require-max-age`. A JWS carries no claims, so
those options do not exist on these calls and reporting them would be
unfixable by the author.

Expect new findings on codebases calling jose's low-level verify API without
an `algorithms` option. The fix is to pass one: `compactVerify(jws, key, {
algorithms: ['ES256'] })`.
