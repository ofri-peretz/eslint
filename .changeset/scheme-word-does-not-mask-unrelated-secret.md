---
'eslint-plugin-node-security': patch
---

fix: `no-timing-unsafe-compare` no longer lets a `scheme` word mask an unrelated secret in the same identifier

A `scheme`/`schemes` word in `nonSecretWords` used to exempt the WHOLE identifier from `secretPatterns` matching, so `schemeToken === req.body.value` was not reported even though `token` independently names a credential. The exemption now cancels only the `auth` pattern it pairs with (`auth_scheme_lower === auth_params.scheme`, the public prefix of an `Authorization` header), so a real secret compared next to a scheme word still reports (#1685).
