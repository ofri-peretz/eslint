---
'eslint-plugin-express-security': patch
---

`no-insecure-cookie-options` no longer reports, or crashes the lint run on, a `.cookie()` call with fewer than two arguments, such as a `secrets.cookie()` getter. Express's `res.cookie(name, value[, options])` always takes a name and a value.
