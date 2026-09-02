---
'eslint-plugin-express-security': patch
---

fix: `req['query']` is the same request bag as `req.query`

Gates across this plugin compared `property.name` before asking what the
property was, so `o['k']` — the notation minifiers and generated clients
emit — did not reach them. They now resolve through the devkit's
`propertyName` / `objectKeyName`.

Five tests had pinned the miss, two of them labelled a "documented false
negative": `req['query'].password`, `req['headers'].host`, `req['path']`,
`req['get']('host')` and `obj['send'](…)` all name exactly what their dotted
spellings name. The runtime-keyed forms — `req.query[key]`,
`req.headers[name]` — stay pinned as the genuine refusals.
