---
'eslint-plugin-node-security': patch
---

fix: `no-deprecated-cipher-method` — correct the report path on a computed subscript.

fix: `no-deprecated-cipher-method` — correct the report path on a computed subscript. The
detection gate reads the property through the computed-aware `propertyName()`,
but the report path re-read it as `(property as Identifier).name`, which is
`undefined` on a Literal — so `crypto['createCipher'](...)` produced the message
`crypto.undefined()`, offered `createDecipheriv` (the DECRYPTION constructor)
for an encryption call, and emitted a suggestion that dropped the quotes and
referenced an identifier resolving nowhere. The stale "Known False Negatives"
entry claiming this form is undetected is corrected to describe the gap that
does remain — a genuinely runtime-chosen key.
