---
'eslint-plugin-secure-coding': minor
'oxlint-plugin-secure-coding': minor
---

feat(secure-coding): new rule no-unguarded-uri-decode (CWE-248). Reports `decodeURIComponent`/`decodeURI` on request or page-location input outside a `try`/`catch`, where a malformed escape such as `p%ss` throws URIError, and a literal that cannot decode. In `strict`, not in `recommended`.
