---
'eslint-plugin-secure-coding': minor
---

Six rules now see `o['k']` as the same access as `o.k`

Each of these decided from `property.type === 'Identifier'`, so a string
subscript slipped past and the rule went silent on code it reports in the
dotted spelling. That is the notation bundlers and code generators emit, so the
rules were reliably off on built output — where nobody is reading by eye either.

- `no-sensitive-data-exposure` — `console['log']('password: 123456')`
- `no-improper-sanitization` — `input['replace']('<', '&lt;')`
- `no-unlimited-resource-allocation` — `Buffer['alloc'](req.query.size)`,
  `tar['extract']()`
- `no-missing-authentication` — `router['get']('/admin/accounts', h)`
- `no-xpath-injection` — `doc['evaluate'](expr)`
- `no-format-string-injection` — `util['format'](userInput)`

A genuinely dynamic `o[m]()` still names nothing and is still ignored; every
rule gained a case pinning that.
