---
'eslint-plugin-node-security': patch
---

fix(node-security): `no-insecure-rsa-padding` and `no-unsafe-buffer-alloc` read the value, not the spelling

- `no-insecure-rsa-padding` reports PKCS#1 v1.5 padding held in a `const` or passed as a shorthand `{ padding }`.
- `no-unsafe-buffer-alloc` treats only an upper bound that rejects the request as a guard. A lower bound (`size > 0`), a check that does not leave, a guard after the allocation, and a cap the peer chooses no longer silence it.
- `no-dynamic-require` documents its `allowPatterns` option.
