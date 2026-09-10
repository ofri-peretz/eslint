---
'eslint-plugin-import-next': patch
---

fix: `default` no longer reports default imports of `export =` / CJS-interop modules

The rule mapped the import specifier to the TypeScript `ImportClause` container, for which
`getSymbolAtLocation` returns `undefined` unconditionally — so the symbol check never did
anything and the rule fell back to a `Default`-key lookup that `export =` modules never
satisfy. It fired on every default import of a CJS-interop or JSON module, `node:process`
included.

The symbol is now resolved from the specifier's own identifier and unwrapped through
`getAliasedSymbol`, matching the sibling `named` rule. Default imports from modules that
genuinely have no default export still report.
