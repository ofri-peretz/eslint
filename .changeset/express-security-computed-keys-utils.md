---
'eslint-plugin-express-security': patch
---

fix: the shared Express evidence utils read a subscripted member

`req['params'].id` is the same client-supplied id, `res['user']` is the same
principal, `registry['auth']` names the same middleware, and
`app['set']('view engine', …)` configures the same renderer. Five gates in
`app-composition`, `auth-evidence` and the shared `utils/index` compared
`property.name` before asking what the property was.

Four tests had pinned the miss, and **two of them were pinning a false
positive**: `no-idor-resource-access` reported an unscoped lookup on a handler
that reads `res['user']` — one of them labelled "documented FN" — and
`require-route-authentication` reported a missing auth check on a route
guarded by `registry['auth']`, on the grounds that the subscript "names the
map, not the middleware inside it". It names `auth`.

The deliberate refusal of `req[config.session.name]` — a key computed from an
expression, which auth0/express-openid-connect actually writes — is preserved:
`propertyName` returns null for exactly that shape.
