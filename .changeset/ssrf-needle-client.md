---
'eslint-plugin-node-security': patch
---

`no-ssrf`: recognise `needle` as an HTTP client, so `needle.get(req.query.url)` reports. The verb-first `needle('get', url)` form is still not covered — the rule only inspects the first argument.
