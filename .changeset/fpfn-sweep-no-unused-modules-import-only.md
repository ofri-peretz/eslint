---
'eslint-plugin-import-next': patch
---

fix: `no-unused-modules`'s `allowImportOnly` exempts only modules that import

The option is documented — in its schema, its JSDoc, and the generated docs — as "Allow
modules that only contain imports", but the implementation read it as a plain
`if (!hasExports && !allowImportOnly)`. Every export-less module was exempted, imports or
not, which made the option a rule-level off switch rather than the narrow exemption its
name and description promise.

Imports are now tracked, so the exemption needs one. A module with no imports at all does
not "only contain imports" under any reading, and still reports.
