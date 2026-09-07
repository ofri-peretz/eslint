---
'eslint-plugin-import-next': patch
---

fix: `no-cross-domain-imports` and `enforce-dependency-direction` no longer crash on a non-string dynamic import

Both rules cast a dynamic import's `Literal` source `as string` and called `.startsWith` on it. `import(42)` and `import(null)` are valid syntax whose Literal value is a number or null, so both rules threw `TypeError: importPath.startsWith is not a function` — an ESLint crash that takes down linting for the whole file, not a lint error on one line.

Any file reaching either rule with a non-string dynamic import was affected. The `as string` assertion is why the compiler could not see it; both now check the type and skip.
