---
"eslint-plugin-express-security": minor
---

Three deprecated rules are no longer part of the `recommended` preset:
`no-missing-cors-check`, `no-missing-csrf-protection` and
`no-missing-security-headers`.

All three carry `deprecated: true` and name a replacement that is *already in
the same preset at `'error'`* — `no-permissive-cors`, `require-csrf-protection`
and `require-helmet` respectively. Every adopter was running each check twice
and getting two findings on one line, where silencing either leaves the other.

Measured on the 13-repo wild corpus (~1,900 files of real Express and NestJS
code): 43 findings removed, 355 → 312, and 21 CSRF locations were being
reported by both rules at once.

The rules remain exported, so anyone enabling them explicitly is unaffected.
They are simply no longer on by default.
