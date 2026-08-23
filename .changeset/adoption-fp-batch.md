---
'eslint-plugin-jwt-security': patch
'eslint-plugin-node-security': patch
'eslint-plugin-secure-coding': patch
---

Five false positives that would have shipped a false claim.

The 2026-08-22 adoption-campaign hand-verification run read every finding in
source before judging it: 8 candidates on open-source repos cloned at HEAD, 7
false positives. Each of these would have gone to a stranger's repo under our
name.

- `jwt/require-algorithm-whitelist` reported a bare `verify(a, b)` in files
  with no JWT in them — LavaMoat's `packages/harden` twice, and shardeum's
  `debugMiddleware.ts`, where it is a Shardus ed25519 signature check. The
  callee's own binding is now resolved: a local declaration, or a binding to a
  non-JWT specifier, is not a JWT call.
- `secure-coding/no-hardcoded-credentials` rated a public EVM address CVSS 9.8
  "Hard-coded Secret key". `0x` + exactly 40 hex is the published half by
  construction; a 64-hex private key still reports.
- `node-security/no-weak-hash-algorithm` reported an X.509 certificate
  thumbprint, which Azure AD/MSAL mandates as the SHA-1 `x5t` header, and a
  log-correlation ticket whose only security signal was the word `sign` in the
  enclosing RPC method's name.
- `node-security/no-math-random-crypto` fired six times on one log-ticket
  idiom, reading `hash` and `code` out of JSON-RPC method names one and two
  function boundaries away from the draw.
- `secure-coding/no-missing-authentication` flagged `get('/is-alive')` at CVSS
  9.8. A liveness probe is unauthenticated on purpose.

Every fix carries a lock that fails on the unfixed rule, and a positive control
that fails if the rule stops detecting the real thing.
