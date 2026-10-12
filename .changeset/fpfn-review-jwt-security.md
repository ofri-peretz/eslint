---
'eslint-plugin-jwt-security': minor
---

fix(jwt-security): close two false negatives from review; require-issued-at joins recommended

- `no-sensitive-payload` no longer skips every spread in a signed request
  object (RFC 9101). Only the builder's own parameter — the authorization
  params it was handed to sign — is exempt; a user record, call result or
  module value spread beside them is still reported.
- The back-channel provenance check no longer treats an unresolved `Response`
  type as the platform `Response` when the module binds that name itself (a
  local `interface` / `type Response`, or an import it cannot read), so
  `decodeJwt((await getReq()).token)` is reported again.
- `require-issued-at` is now in `recommended` as `warn` (CVSS 5.0). Without
  `iat`, a verifier's `maxAge` / `maxTokenAge` has nothing to bound.
