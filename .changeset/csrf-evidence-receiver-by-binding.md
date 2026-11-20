---
'eslint-plugin-express-security': patch
---

fix(express-security): `require-csrf-protection` finds the request by its binding, not by its name

Whether a handler reads a cookie, a session or the `Authorization` header is now decided against the handler's first parameter, whatever it is spelled (`(r, s) => r.cookies.sid`). A local variable that merely happens to be called `req` is no longer taken for the request.
