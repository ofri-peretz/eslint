---
'eslint-plugin-postgresql-security': patch
---

fix(postgresql-security): String.raw statements survive the parser bump

`@typescript-eslint` 8.68.0 changed `TemplateElement.value.cooked`: 8.54.0
typed it `string` and emitted the RAW text for an escape it could not cook,
8.68.0 types it `string | null` and emits `null`. Both directions were verified
against a real 8.54.0 install, not read off a changelog.

`check-query-params` carried a comment reading "`cooked` is typed non-nullable
and this parser never nulls it". Its own regression lock — "String.raw with an
escape the cooked value cannot hold" — was the ONLY thing in the repo that
caught the change. `no-unsafe-search-path`, `no-unsafe-copy-from` and the module
gate that recognises a `postgres://` DSN unwrap `String.raw` too and had the
same defect, now locked individually. The four rules whose statement text comes
from an argument node cannot be reached by a tagged template and assert instead.
