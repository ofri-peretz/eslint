---
'eslint-plugin-node-security': minor
---

feat(node-security): add `no-dynamic-algorithm-selection` (CWE-327)

Disallow dynamic (non-literal) algorithm names in Node.js crypto functions.
A runtime-selected algorithm argument can allow a downgrade to a broken or
risky cryptographic algorithm (CWE-327: Use of a Broken or Risky
Cryptographic Algorithm). AST-structural — flags non-literal algorithm
arguments to the crypto APIs.
