---
'eslint-plugin-jwt-security': patch
'oxlint-plugin-jwt-security': patch
---

fix(jwt-security): no-decode-without-verify reports a claim converted before it becomes the key

The decode-then-verify exemption let a decoded claim reach the verify's key through any call, because a call there is normally a per-user key lookup (`getKey(claims.kid)`). `String(claims.secret)`, `Number(...)`, `BigInt(...)` and `Buffer.from(...)` / `Buffer.alloc(...)` hand back the claim itself, so `jwt.verify(token, String(claims.secret), ...)` was accepted while `jwt.verify(token, claims.secret, ...)` reported. These conversions now carry the claim through unchanged and the call reports. A lookup whose result is converted (`String(getKey(claims.kid))`) is still accepted.
