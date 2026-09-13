---
'eslint-plugin-conventions': patch
---

fix(conventions): `filename-case` stops prescribing a rename it would reject

For a multi-dot basename the suggested name was not a fixed point of the
rule's own check:

```
Filename "vitest.config.ts" violates kebabCase naming convention
Fix: Rename file from "vitest.config.ts" to "vitest.config.ts"
```

Performing that rename could never clear the report. The mixed-case form was
stuck the same way without being identical — `My.Config.ts` suggested
`my.config.ts`, which `isKebabCase` still rejects, because `getSuggestedName`
transformed `[a-z][A-Z]`, `_` and whitespace but never `.`.

Reporting these filenames is unchanged and correct: `.` is not a kebab-case
character, the stripped-suffix list (`.spec`/`.test`/`.stories`/`.story`/
`.e2e`/`.d`) is deliberately enumerated, and the docs point at
`ignore: [/\.config\./]` for config files. Only the target was wrong. The case
transformers now treat `.` as a word separator, as they already do `-`, `_`
and whitespace, so every suggestion satisfies `matchesCase`.
