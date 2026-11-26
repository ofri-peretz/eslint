---
'eslint-plugin-node-security': patch
'@interlace/eslint-devkit': minor
---

fix(node-security): `no-timing-unsafe-compare` no longer reports an etag check, a record id, or the caller's own `@Body()` value

Three false-positive shapes turned up when scanning Wiki.js, Trigger.dev and Docmost:

- An `If-None-Match` / `If-Match` header compared with the etag the handler sends back. The etag is public, even when it is a SHA-1 of the content. The exemption covers only a keyless `createHash(…).update(…).digest(…)` chain, or a value neither named as a secret nor derived with crypto, followed through single-write bindings, and only a request header receiver; the same header against a stored secret, an HMAC under any name or a digest with another value concatenated in still reports. This covers `req.headers[…]`, `headers.get(…)`, `req.get(…)` and a `const` bound to any of them.
- A name ending in `Id`/`Ids`, such as `localAuthId` or `tokenId`, is now a record key. These were added to the default `nonSecretTails`. A configured secret pattern that itself ends in the tail is still a secret, so `sessionId` keeps reporting.
- A NestJS `@Body()` / `@Query()` / `@Param()` parameter now reads as the request. Docmost's `dto.sessionId === req.raw.sessionId` has the caller on both sides, so it is not reported. A `@Body()` token compared with a stored reset token now reports; before, it read as two server values.

devkit: `requestSource` (structural request-payload recognition, including `hasPayloadDecorator`) is now exported, namespaced like `valueFollow`.
