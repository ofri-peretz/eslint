---
'eslint-plugin-node-security': minor
---

feat(node-security): add `no-math-random-crypto` (CWE-338)

Detects `Math.random()` used in cryptographic contexts (tokens, keys, secrets,
salts, IVs, session IDs) and steers to `crypto.randomBytes()` / `crypto.randomUUID()`.

This was the one cryptography rule that the deprecated `eslint-plugin-crypto`
shipped but had **not** been carried into `node-security` during the 2026-05
consolidation — so `eslint-plugin-crypto`'s deprecation notice ("node-security
includes all cryptography rules") was previously inaccurate. It is now true.

Added to the `recommended` preset as `error`. The detection is return/assignment
context-aware (matches `crypto`-named variables, properties, and function
returns) so benign uses like a Fisher-Yates shuffle into a non-crypto variable
do not false-positive — verified against the fn-fp benchmark (40/40 detection,
0 false positives with the crypto-free fleet).
