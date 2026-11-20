---
'eslint-plugin-express-security': minor
---

fix(express-security): stop abstaining on route modules that receive `app` instead of importing express

The plugin skips a file unless it shows Express evidence, and a route module that exports
`(app, db) => { app.get(...) }` imports nothing and uses the two-argument `(req, res)` handler, so
every rule in the plugin stayed silent on it, `no-user-controlled-redirect` included. A handler
registered against a literal path with the `(req, res)` pair
(`app.get('/learn', guard, (req, res) => ...)`) now counts as Express evidence. Fastify
(`request, reply`), Koa (`ctx`), a bare `node:http` handler and `cache.get('/k', fn)` still do not
open the gate. Expect new findings in files of that shape.

`require-route-authentication` now recognises `isLoggedIn` / `loggedIn` / `ensureLoggedIn()` as
authentication guards. The name has neither `auth` nor `login` in it, so the most common spelling of
the guard read as no guard at all, which the wider gate would have turned into new false positives.
