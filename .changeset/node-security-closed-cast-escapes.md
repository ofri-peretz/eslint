---
'eslint-plugin-node-security': patch
---

fix(node-security): no-dynamic-algorithm-selection no longer trusts a cast hidden under `satisfies` or inside a helper

`(req.query.alg as 'sha256') satisfies 'sha256'` and a helper declared `: 'sha256' | 'sha512'` whose
body returns `value as 'sha256'` both still report: the cast is erased at runtime. `as const` and a
cast of a literal keep the exemption.
