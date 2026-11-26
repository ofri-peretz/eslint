---
'eslint-plugin-jwt-security': patch
---

`require-algorithm-whitelist` no longer reports a jose verify whose key already fixes the algorithm family. jose checks the key against the header `alg` and refuses `none`, so `jwtVerify(token, createLocalJWKSet({ keys }))`, `jwtVerify(token, new TextEncoder().encode(secret))` and a key from `importSPKI` / `importX509` / `importPKCS8` / `importJWK` cannot be steered to a weaker family by the token. The key is read structurally in the same file (a `const` is followed); a key from a parameter or an unreadable call, a callee that is not imported from jose, and every jsonwebtoken call keep being reported. Seen on Payload and logto.
