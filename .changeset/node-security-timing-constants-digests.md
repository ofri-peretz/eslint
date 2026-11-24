---
'eslint-plugin-node-security': patch
---

fix: no-timing-unsafe-compare skips imported literal constants and plain digests of request data

An imported name is followed across relative imports, and a value written there as a literal counts as a constant, the way a local `const` already did. Unleash compares an event type with `API_TOKEN_DELETED = 'api-token-deleted'`, which was reported because of the word `token`. A `createHash(...).update(...).digest()` is a secret only when something it hashes was not supplied by the caller. Before, comparing the SHA-256 of the request body with the client's `content-sha256` header was reported, as in Unleash's edge HMAC verifier. Keyed derivations and digests of stored values still report.
