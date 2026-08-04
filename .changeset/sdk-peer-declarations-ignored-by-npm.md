---
'eslint-plugin-express-security': patch
'eslint-plugin-jwt': patch
'eslint-plugin-lambda-security': patch
'eslint-plugin-maintainability': patch
'eslint-plugin-nestjs-security': patch
'eslint-plugin-react-features': patch
'eslint-plugin-vercel-ai-security': patch
---

Fix SDK peer declarations that npm silently ignored

Seven plugins listed their target SDKs under `peerDependenciesMeta` with
`{"optional": true}` but never declared them in `peerDependencies`. npm drops
any `peerDependenciesMeta` entry that has no matching `peerDependencies` key,
so the metadata was inert — these packages effectively declared **no SDK peer
at all**. Nothing warned: the failure mode of a dependency you never declared
is silence.

Each SDK now appears in both maps, matching the shape `eslint-plugin-pg` and
`eslint-plugin-mongodb-security` already use — a supported major range in
`peerDependencies`, `optional: true` in `peerDependenciesMeta`:

| Plugin | SDK | Range |
| :--- | :--- | :--- |
| `express-security` | `express` | `^4.0.0 \|\| ^5.0.0` |
| | `helmet` | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` |
| | `cors` | `^2.0.0` |
| | `csurf` | `^1.0.0` |
| | `express-rate-limit` | `^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` |
| `jwt` | `jsonwebtoken` | `^8.0.0 \|\| ^9.0.0` |
| | `@nestjs/jwt` | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0` |
| | `express-jwt` | `^7.0.0 \|\| ^8.0.0` |
| | `jose` | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0` |
| | `jwks-rsa` | `^3.0.0 \|\| ^4.0.0` |
| | `jwt-decode` | `^3.0.0 \|\| ^4.0.0` |
| `lambda-security` | `@aws-sdk/client-lambda` | `^3.0.0` |
| | `@middy/core` | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
| | `@middy/http-cors` | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
| | `@middy/http-security-headers` | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
| | `@middy/validator` | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
| `maintainability` | `typescript` | `>=4.8.4` |
| `nestjs-security` | `@nestjs/common` | `^9.0.0 \|\| ^10.0.0 \|\| ^11.0.0` |
| | `@nestjs/throttler` | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0` |
| | `class-validator` | `^0.14.0 \|\| ^0.15.0` |
| | `class-transformer` | `^0.5.0` |
| `react-features` | `typescript` | `>=4.8.4` |
| `vercel-ai-security` | `ai` | `^4.0.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |

Ranges were taken from each SDK's real release history, bounded below by the
oldest major whose call shape the rules still match and above by the current
major. `cors`, `csurf`, `class-transformer` and `@aws-sdk/client-lambda` have
only ever shipped one usable major. The `ai` range spans v4 because
`require-max-steps` deliberately accepts both the v4 `maxSteps` option and the
v5+ `stopWhen` form. The two `typescript` entries reuse the `>=4.8.4` bound
`@interlace/eslint-devkit` already declares, since these are the same
type-aware-graceful rules behind the same optional TS program.

Every range admits the version this repo's `__compatibility__` specs are
actually tested against, so the declaration cannot drift from what CI proves.

**Nothing to migrate.** Every entry stays optional, so no install adds a
package or emits a warning when the SDK is absent. What changes is that a
consumer on an unsupported major now gets a peer warning instead of nothing —
which was the point of the metadata in the first place.
