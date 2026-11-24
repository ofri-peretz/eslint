---
'eslint-plugin-node-security': patch
---

fix: no-timing-unsafe-compare skips imported literal constants and plain digests of request data

An imported name is followed across relative imports, and a value written there as a literal counts as a constant, the way a local `const` already did. Unleash compares an event type with `API_TOKEN_DELETED = 'api-token-deleted'`, which was reported because of the word `token`. A property of an imported object of literals counts too: Ghost compares `ctx.path` with `ROUTES.resetPassword`. A `createHash(...).update(...).digest()` is a secret only when something it hashes was not supplied by the caller. Before, comparing the SHA-256 of the request body with the client's `content-sha256` header was reported, as in Unleash's edge HMAC verifier. The digest is recognised through the `crypto` namespace too (`crypto.createHash(...)`). Keyed derivations and digests of stored values still report, and so does an HMAC written inline in the template it is compared as (`` `sha256=${createHmac(...)...}` === header ``), which was missed before.
