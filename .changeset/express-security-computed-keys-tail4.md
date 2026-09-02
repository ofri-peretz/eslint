---
'eslint-plugin-express-security': patch
---

fix: render, route and request-source gates read a subscripted member

`res['render']('v', locals)` renders the same template, `req['body']` is the
same request body, and `app['post']('/x', h)` registers the same unauthenticated
route. The sanitizer allowlist is a suppression path — missing `esc['clean'](v)`
there meant reporting a value that had already been cleaned.

The genuine refusals beside them — `req[body]`, `res[render]`, `app[method]`,
where the key is chosen at runtime — stay refused.
