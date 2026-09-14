---
'eslint-plugin-import-next': patch
---

fix: `extensions` checks `export … from` and `export * from`

The rule registered only an `ImportDeclaration` visitor, so the same specifier string got
opposite verdicts one line apart: `import { Argument } from './argument.js'` reported,
`export { Argument } from './argument.js'` stayed silent. For a rule whose contract is
"ensure consistent use of file extensions", `--fix` left the file less consistent than it
found it.

Both export-from forms now route through the same check. Sibling rules in this package
(`no-unresolved`, `no-internal-modules`) already treated "imports" as meaning module
specifiers rather than the `ImportDeclaration` node type.
