---
'eslint-plugin-jwt-security': patch
---

fix(jwt-security): `require-expiration` enforces `maxExpirationSeconds`; option docs say what is read

- `require-expiration` now reads `maxExpirationSeconds`, which was documented and ignored. When set, a token whose lifetime the file states statically and that exceeds the limit is reported: `expiresIn` as seconds or as an `ms` string (`'7d'`, `'2 hours'`), and a payload `exp` of `Math.floor(Date.now() / 1000) + N`. A lifetime from the environment, a parameter or a call is not judged. The option is opt-in: its schema default of 86400 is removed, so an unchanged config reports nothing new.
- The rule docs now say plainly that `trustedSanitizers`, `strictMode`, `recommendedAlgorithms`, `knownAudiences`, `knownIssuers`, `envPatterns`, and `trustedAnnotations` (everywhere but `no-decode-without-verify`) have no effect. They stay in the schemas, so existing configs remain valid.
