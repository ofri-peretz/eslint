---
'eslint-plugin-express-security': patch
---

`no-user-controlled-redirect`: a guard inside a nested function no longer counts as a guard.

The origin-guard search descended into nested functions, so a check whose `return` exits a
helper rather than the request handler silenced the rule while validating nothing.
