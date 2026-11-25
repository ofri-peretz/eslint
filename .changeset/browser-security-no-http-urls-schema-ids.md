---
'eslint-plugin-browser-security': patch
'oxlint-plugin-browser-security': patch
---

fix(no-http-urls): stop reporting JSON Schema `$schema` and `$id` identifiers

`no-http-urls` no longer reports the values of `$schema` and `$id` properties: they identify a schema dialect or document, are compared as strings and never fetched. Only those two keys are exempt; `$ref`, `schemaUrl` and every other key still report.
