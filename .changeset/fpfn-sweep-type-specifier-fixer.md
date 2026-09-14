---
'eslint-plugin-import-next': patch
---

fix: `consistent-type-specifier-style` stops rebuilding away parts of the import

Two losses from the same whole-statement rebuild.

A string-literal imported name was read through `imported.value`, which drops the quotes:
`import type { 'a-b' as AB }` was rewritten to `import { type a-b as AB }`, output that no
longer parses. The specifier's own source text is read instead.

An import attribute is not a specifier, so rebuilding from `namedSpecifiers` deleted it —
`with { type: 'json' }` silently gone, which is `TS1543` at compile time and
`ERR_IMPORT_ATTRIBUTE_MISSING` at runtime. The preference still reports; only the rewrite
stops, the same guard the default-binding case already had.
