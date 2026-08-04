---
'eslint-plugin-import-next': patch
---

Don't require `typescript` at module load — the plugin threw on a clean install
for anyone linting plain JavaScript.

`named`, `namespace` and `default` imported `typescript` at top level for a
handful of enum values (`SymbolFlags.Alias`, `SyntaxKind.NamespaceImport`,
`InternalSymbolName.Default`). That put `require("typescript")` in the emitted
output, while the package declares no dependency or peer on TypeScript at all —
so `npm i -D eslint-plugin-import-next` produced a package that threw
`Cannot find module 'typescript'` on require.

Those values are only needed on a path that already holds a TypeScript `Symbol`,
which means the checker ran, which means TypeScript is installed. Access is now
lazy and memoised via `utils/typescript-peer.ts`, so the plugin imports cleanly
without TypeScript and costs one `require` on the type-aware path.

Found by the new clean-install smoke test on its first full run.
