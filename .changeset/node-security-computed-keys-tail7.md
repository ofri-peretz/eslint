---
'eslint-plugin-node-security': patch
---

fix: TOCTOU roots, secure deletion and CSPRNG checks read a subscripted member

`os['homedir']()` names the same per-user root, `Reflect['deleteProperty'](rec,
'password')` unbinds the same secret without scrubbing it, and
`crypto['randomBytes'](n)` is the same CSPRNG call.
