---
'eslint-plugin-node-security': patch
---

`no-timing-unsafe-compare` no longer reports comparisons against constants.

Measured over the 8-repo corpus scan: **106 findings → 26**, with the surviving
26 being genuine timing-unsafe comparisons (`password !== confirmPassword`,
`hash !== token.claims.at_hash`, `claims.nonce !== nonce`) rather than name
collisions.

Three guards, each keyed to evidence rather than to a name:

- **A constant operand.** `revokedToken === 'access'` (okta/okta-auth-js
  `lib/oidc/dpop.ts:185`) cannot leak a secret — the value being compared
  against is in the source, not in the attacker's head. String literals were
  previously allowed through on the argument that
  `password === 'default_password'` is a real finding; it is, but as CWE-798,
  which `secure-coding/no-hardcoded-credentials` reports. Constant-time
  comparison against a credential printed in the source protects nothing.

- **Boolean predicate names.** `prevState.isAuthenticated === state.isAuthenticated`
  (`lib/core/AuthStateManager.ts:44`) matched only because `isAuthenticated`
  contains `auth`. Comparing two booleans leaks one bit the caller already holds.

- **Namespaced constants.** `name === IDX_STEP.SELECT_AUTHENTICATOR_AUTHENTICATE`,
  `authenticatorKey === AUTHENTICATOR_KEY.WEBAUTHN`,
  `err.name === Enums.AUTH_STOP_POLL_INITIATION_ERROR` — 73 of the 88 findings
  left after the first two guards. `process.env.API_TOKEN` is excluded from
  this guard: it is SCREAMING_SNAKE but holds a live secret.

A *bare* `API_KEY === expected` still reports. Constant casing alone is not
evidence — the namespace is.
