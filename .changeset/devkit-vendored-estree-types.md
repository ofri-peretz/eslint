---
'@interlace/eslint-devkit': patch
---

chore: vendor the AST and rule type declarations devkit uses

A generated, type-only snapshot of `TSESTree`, `TSESLint`, `ParserServices` and `JSONSchema4` from the pinned `@typescript-eslint` packages now lives in the devkit source. Nothing imports it yet and nothing published changes. It is the first step toward devkit no longer needing `@typescript-eslint/utils` installed to type-check.
