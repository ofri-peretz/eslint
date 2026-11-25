---
'eslint-plugin-jwt-security': patch
'oxlint-plugin-jwt-security': patch
---

fix(jwt-security): no-decode-without-verify reports a claim converted by a value-preserving method

`jwt.verify(token, claims.secret.trim(), ...)` (and `.toString()`, `.trimStart()`, `.trimEnd()`, `.toLowerCase()`, `.toUpperCase()`, `.normalize()`, `.valueOf()`) counts as the claim itself, like `String(claims.secret)`, so it reports. A claim used as a computed index, `keys[claims.kid]`, is a lookup like `getKey(claims.kid)` and stays exempt. The list of conversions is closed; an unknown call is a lookup.
