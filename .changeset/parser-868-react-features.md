---
'eslint-plugin-react-features': patch
---

fix(react-features): no-arbitrary-token-class scans a tagged className again

`@typescript-eslint` 8.68.0 changed `TemplateElement.value.cooked`: 8.54.0
typed it `string` and emitted the RAW text for an escape it could not cook,
8.68.0 types it `string | null` and emits `null`. Both directions were verified
against a real 8.54.0 install, not read off a changelog.

The rule selects `TemplateElement` under a `className` attribute, so a tagged
template reaches it and a null `cooked` skipped the quasi — `rounded-[12px]`
shipped unreported. It falls back to `raw`; the lock fails when the fallback is
`''` instead.
