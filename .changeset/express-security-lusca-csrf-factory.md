---
'eslint-plugin-express-security': patch
'oxlint-plugin-express-security': patch
---

fix(express-security): require-csrf-protection sees lusca's CSRF middleware built inside a wrapper (`lusca.csrf()(req, res, next)`) and `lusca({ csrf: true })` in a route chain
