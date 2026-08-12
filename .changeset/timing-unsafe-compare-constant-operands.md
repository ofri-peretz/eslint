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
  left after the first two guards.

  This guard requires **both** halves to carry the convention: a
  namespace-cased object (PascalCase or SCREAMING_SNAKE) *and* a constant-cased
  property, on a non-computed member. Every one of those 73 findings satisfies
  both, and requiring both is what keeps it from swallowing real secrets:
  `userToken === credentials.API_TOKEN` still reports (`credentials` is an
  ordinary runtime value), as do `secrets[API_TOKEN]` (computed — the property
  name is unknowable) and `process.env.API_TOKEN` in both its dot and
  `process['env']` spellings.

A *bare* `API_KEY === expected` still reports. Constant casing alone is not
evidence — the namespace is.
