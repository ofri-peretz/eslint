---
'eslint-plugin-browser-security': patch
---

fix: `app['use'](cors({ origin: '*' }))` installs the same middleware

`no-missing-cors-check` read the middleware method off `property.name`, so a
subscripted `use` registered a wildcard CORS config unreported.
