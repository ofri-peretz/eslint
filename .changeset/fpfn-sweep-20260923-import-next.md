---
'eslint-plugin-import-next': patch
---

fix(import-next): `no-unused-modules` and `unambiguous` recognise TypeScript `export =`.

A `.cts` file whose only export is `export = { … }` was reported by
`no-unused-modules` as "Module has no exports", and by `unambiguous` as a file
that could be parsed as a script. `export =` compiles to `module.exports =`,
which `no-unused-modules` already counts, and it is a syntax error in a script.
Both rules now treat `TSExportAssignment` as module/export syntax.
