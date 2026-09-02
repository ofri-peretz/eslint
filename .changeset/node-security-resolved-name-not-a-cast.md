---
'eslint-plugin-node-security': patch
---

refactor: crypto, fs and archive reads distinguish an unnameable key from an unknown one

`SET.has(propertyName(node) as string)` reaches the right answer for the wrong
reason. `propertyName` returns `string | null` because `o[k]` names a property
the AST cannot read, and that is not the same answer as "named, and not one of
these" — the cast collapses both, and `Set.prototype.has(null)` being false is
what made it look correct.

33 sites across 18 files now ask the two questions separately, via
`namesOneOf` / `memberPropertyName` from the devkit or an explicit `!== null`.

No rule behaviour changes: this package's test count and coverage are unchanged.
