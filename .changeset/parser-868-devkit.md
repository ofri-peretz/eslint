---
'@interlace/eslint-devkit': patch
---

fix(devkit): a null cooked quasi no longer erases a credential URL

`@typescript-eslint` 8.68.0 changed `TemplateElement.value.cooked`: 8.54.0
typed it `string` and emitted the RAW text for an escape it could not cook,
8.68.0 types it `string | null` and emits `null`. Both directions were verified
against a real 8.54.0 install, not read off a changelog.

`staticStringValue` read `cooked` directly, and its `Literal, TemplateLiteral`
visitor also sees the quasis of TAGGED templates — so a `String.raw` DSN with a
bad escape went from "the URL as written" to "no static value at all". It now
falls back to `raw`, which for `String.raw` is exactly the string a driver
receives.
