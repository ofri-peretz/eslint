---
'eslint-plugin-jwt-security': patch
---

fix(jwt-security): five wrong verdicts in three rules surfaced by Stryker mutation testing

- `no-decode-without-verify` no longer reports a file that imports no JWT library just because it defines its own helper named `jwtDecode`; the jwt-decode name fallback now goes through the same library gate as every other path.
- `no-decode-without-verify` accepts `const { exp } = jwt_decode(token)` (the jwt-decode v3 spelling) as the client-side refresh check it documents, as it already did for `jwtDecode`.
- `no-decode-without-verify` honours its documented default `trustedAnnotations` (`@decoded-header-only`, `@verified-separately`) without configuration.
- `require-expiration` reads a computed `{ ['exp']: … }` key as the exp claim.
- `require-issued-at` reports a runtime `noTimestamp` even when the payload sets `iat` — jsonwebtoken deletes an explicit `iat` under `noTimestamp: true`.
- `no-decode-without-verify`: `.header.kid` is exempt only on `decode(token, { complete: true })`, the one call shape that returns the header. Without it — jsonwebtoken's plain decode, or jwt-decode, which returns the payload — `.header.kid` reads an unverified payload claim, and now reports.
