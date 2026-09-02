---
'eslint-plugin-secure-coding': patch
---

refactor: injection and privilege checks resolve a property once, not twice

`SET.has(propertyName(node) as string)` reaches the right answer for the wrong
reason. `propertyName` returns `string | null` because `o[k]` names a property
the AST cannot read, and that is not the same answer as "named, and not one of
these" — the cast collapses both, and `Set.prototype.has(null)` being false is
what made it look correct.

30 sites across 18 files now ask the two questions separately, via
`namesOneOf` / `memberPropertyName` from the devkit or an explicit `!== null`.

No rule behaviour changes: this package's test count and coverage are unchanged.
