---
'eslint-plugin-express-security': minor
---

**`express-security/no-exposed-debug-endpoints` — only route registrations count.** The rule had a second listener that reported *any* bare string literal equal to a debug path (`/admin`, `/health`, `/debug`, …) anywhere in a file. A redirect-URL constant tripped it while authoring benchmark corpus fixtures — `const ADMIN_PATH = '/admin'`, `res.redirect('/admin')` and `if (req.path === '/health')` were all CWE-489 "Exposed Debug Endpoint" findings, none of which registers an endpoint. That listener is gone: a literal is reported only as the path argument of an express route registration.

The registration check also now covers every express routing method (`put`, `patch`, `delete`, `head`, `options`, `all`) rather than just `get` / `post` / `use`, so `app.delete('/admin/users/:id', handler)` is caught where it previously was not.
