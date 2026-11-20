---
'eslint-plugin-express-security': minor
'eslint-plugin-mongodb-security': minor
---

fix(eslint-rules): stop abstaining on route and DAO modules that import nothing

Both plugins skip a file unless it shows evidence of its framework, and both missed the most
common way a module receives its framework: as an argument.

express-security: a handler registered against a literal path with the `(req, res)` pair
(`app.get('/learn', guard, (req, res) => ...)`) now counts as Express evidence. Route modules
that export `(app, db) => { ... }` import nothing and use the two-argument handler, so every rule
in the plugin, `no-user-controlled-redirect` included, stayed silent on them. Fastify
(`request, reply`), Koa (`ctx`), a bare `node:http` handler and `cache.get('/k', fn)` still do not
open the gate.

mongodb-security: a collection handle held in a variable
(`const col = db.collection('x'); col.find(q).toArray(cb)`) now counts as MongoDB evidence once a
native-driver method is called through it. Only the chained `db.collection('x').find(...)` form was
recognised, so a DAO constructed with a connected `db` silenced `no-unsafe-where` and the rest of
the plugin. A Firestore handle in a variable (`col.doc(id).get()`) still does not.

Expect new findings in files of those shapes.

express-security also: `require-route-authentication` now recognises `isLoggedIn` / `loggedIn` /
`ensureLoggedIn()` as authentication guards. The name has neither `auth` nor `login` in it, so the
most common spelling of the guard read as no guard at all, which the wider gate above would have
turned into new false positives.
