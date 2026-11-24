---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): `no-insecure-comparison` recognises computed-key and template spellings of its re-encoding and string-argument shapes

`signature['toString']('base64url')` written with a computed key or a template literal is now treated like its dotted form, so the canonical-form exemption applies whichever way the code is written. A `status` field of a token record is covered by a test.
