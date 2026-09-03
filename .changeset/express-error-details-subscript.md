---
'eslint-plugin-express-security': patch
---

fix: `res['send'](err['stack'])` leaks the same trace

Both halves were gated on `property.name` — the response method and the error
field — so a subscripted send of a subscripted stack went unreported. Two
tests had pinned it, one as a "documented false negative", and the rule's own
documentation told readers `err['stack']` was undetected. The docs now
describe what is genuinely out of reach: a property named at runtime.
