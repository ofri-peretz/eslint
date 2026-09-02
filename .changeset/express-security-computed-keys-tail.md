---
'eslint-plugin-express-security': patch
---

fix: `process['cwd']()` is the same application root as `process.cwd()`

`no-static-root-exposure` refused the subscripted spelling of `process.cwd()`
and `path.join(…)`, so serving the application root went unreported.
