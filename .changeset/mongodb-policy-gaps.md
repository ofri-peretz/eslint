---
'eslint-plugin-mongodb-security': patch
---

fix(mongodb-security): five rules follow the 2026-10 owner decisions on what to report

- `no-unsafe-query` no longer reports request input coerced to a string by a template literal or `+` (`` `${req.body.name}` ``, `'user:' + req.body.name`), nor a template-literal / `String()` id passed as the whole filter (`findById(String(req.params.id))`). A string cannot carry `{ $ne: null }`; `String(req.body.x)` was already quiet. A `$where` string is left to `no-unsafe-where`, which reports it.
- `no-operator-injection` finds request input in the AST — a `.body` / `.query` / `.params` read off a handler parameter — instead of searching the source text, so `prereq.bodyCount` is no longer `req.body` and Fastify's `(request, reply)` is now read. A value that can only be a primitive is not reported: `Number(x)`, `parseInt(x)`, `parseFloat(x)`, `Number.parseInt(x)`, `String(x)`, `+x`, a template literal, arithmetic. `req.query.min || 0`, `[req.query.role]` and `JSON.parse(req.query.min)` stay reported.
- `no-unsafe-regex-query` no longer reports its own documented fix: a `$regex` template whose every interpolation is an escaper call — `escapeRegex`, `escapeRegExp`, `_.escapeRegExp`, `escapeStringRegexp`, or the default export of `escape-string-regexp` / `lodash.escaperegexp` under any name.
- `no-debug-mode-production` no longer reports `.set('debug', true)` on a receiver provably made by `express()` or `express.Router()` (Express's own `debug` setting); an untraced receiver is still reported. It now reports the callback form `mongoose.set('debug', (coll, method, query) => …)`, with a suggestion that keeps the logger behind a `NODE_ENV` check.
- `no-unsafe-populate` no longer reports a `const` naming a string path (`const AUTHOR = 'author'; .populate(AUTHOR)`), and now reports a path built from request input as a template literal or an array element (``.populate(`${req.query.rel}`)``, `.populate([req.query.rel, 'author'])`). A quoted `{ 'path': … }` key is now read like `{ path: … }`.
