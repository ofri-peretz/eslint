---
'eslint-plugin-node-security': patch
---

fix: `path['basename'](userPath)` sanitizes, and is no longer reported

Six gates in `detect-non-literal-fs-filename` read
`property.type === Identifier` alongside a `propertyName(...)` call — strictly
narrower, and evaluated first — so the resolver never ran. `path.basename()`
is the remediation this rule's own message recommends, which made the rule
report code that had taken its advice.

Measured both ways: 1 finding before, 0 now, while `path[pick](...)` still
reports, because a key chosen at runtime cannot be shown to be `basename`.
