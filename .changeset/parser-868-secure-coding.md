---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): template text reads assert instead of concatenating null

`@typescript-eslint` 8.68.0 changed `TemplateElement.value.cooked`: 8.54.0
typed it `string` and emitted the RAW text for an escape it could not cook,
8.68.0 types it `string | null` and emits `null`. Both directions were verified
against a real 8.54.0 install, not read off a changelog.

`no-sensitive-data-exposure` and `no-improper-sanitization` join template quasis
into the text they match against. Both are handed an argument node, where a
tagged template arrives as `TaggedTemplateExpression` and an untagged one with a
bad escape is a parse error, so `cooked` cannot be null there — the reads now
say so rather than letting `null` fall into a `join`.
