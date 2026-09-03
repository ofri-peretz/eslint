---
'eslint-plugin-conventions': patch
---

fix(conventions): utm-taxonomy reads tagged quasis again

`@typescript-eslint` 8.68.0 changed `TemplateElement.value.cooked`: 8.54.0
typed it `string` and emitted the RAW text for an escape it could not cook,
8.68.0 types it `string | null` and emits `null`. Both directions were verified
against a real 8.54.0 install, not read off a changelog.

`utm-taxonomy` walks every quasi of every `TemplateLiteral`, tagged ones
included, and reports straight off the text. A null `cooked` meant a
`String.raw` link with an off-taxonomy `utm_source` stopped being reported at
all. It falls back to `raw`, locked by a test that fails without it.
