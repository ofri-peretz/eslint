---
'eslint-plugin-browser-security': patch
'eslint-plugin-express-security': patch
'eslint-plugin-mongodb-security': patch
'eslint-plugin-node-security': patch
---

fix: MIME, helmet, TLS and stream gates read a subscripted member

`file['type']`, `form['append'](k, file)`, `app['use'](helmet())`,
`mongoose['connect'](uri)` and `fs['createReadStream'](p)` each do exactly what
their dotted spellings do. Seven gates across four plugins compared
`property.name` before asking what the property was.

`require-tls-connection` had pinned `mongoose['connect'](uri)` as valid on the
grounds that "methodName is null" — it opens the same connection with no TLS,
and the rule now offers the same `{ tls: true }` repair it offers the dotted
form.
