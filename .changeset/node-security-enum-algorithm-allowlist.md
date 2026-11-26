---
'eslint-plugin-node-security': patch
---

`no-dynamic-algorithm-selection` no longer reports an algorithm name read from a string enum declared in the same file. `createCipheriv(SecretEncryptionAlgo.AES_256_GCM, key, iv)`, and a `const` that holds such a member, can only produce a name the author wrote down, which is the allowlist the rule asks for. A member read by a caller-supplied key (`Algo[name]`), an enum with a numeric or computed member, a merged enum and an imported enum keep being reported. Seen on Infisical.
