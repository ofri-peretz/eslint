---
'eslint-plugin-browser-security': patch
---

fix: `no-insecure-redirects` now reports the string-subscript spelling

`res['redirect'](req.query.url)` is the same open redirect as
`res.redirect(req.query.url)`, and `location.hash['slice'](1)` strips the same
leading `#`. Both went unreported: the sink test and the steerability
passthrough compared `property.name` before asking what the property was, so a
single bracket — the notation minifiers and generated clients emit — made the
finding disappear.

Four spellings are now pinned in the rule's own tests, so neither half can
re-open.
