---
'eslint-plugin-browser-security': patch
---

fix: header and host-check detection now read a string-subscript method

`res['setHeader'](…)` sets the same header, `NextResponse['next'](…)` builds
the same response, and `url['includes']('trusted.com')` is the same incomplete
host check. `no-missing-security-headers` and `no-incomplete-url-sanitization`
compared `property.name` first, so 57 of their true positives disappeared
behind one bracket.

Three tests had pinned the miss. Two described the guard rather than a
behaviour ("computed member property", "property is not an Identifier"); the
third refused `map['url']` as a receiver "not known to hold a URL" while
accepting `map.url` two lines above. All three now assert the report, and the
genuinely unknowable runtime-key forms — `res[method](…)`, `url[check](…)`,
`NextResponse[make](…)` — are pinned as the refusals.
