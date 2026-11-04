---
'eslint-plugin-express-security': patch
---

fix(express-security): `require-express-body-parser-limits` reads a quoted or string-subscript `limit` key (`{ 'limit': '50mb' }`, `{ ['limit']: '50mb' }`), which it used to skip, and no longer treats a computed `[limit]` variable key as the option.
