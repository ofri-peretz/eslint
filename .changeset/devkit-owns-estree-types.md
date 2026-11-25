---
'@interlace/eslint-devkit': patch
'eslint-plugin-express-security': patch
'eslint-plugin-lambda-security': patch
'eslint-plugin-mcp-sdk-security': patch
'eslint-plugin-secure-coding': patch
'eslint-plugin-supabase-security': patch
---

chore: published type declarations no longer import `@typescript-eslint/utils`

The `TSESTree`, `TSESLint`, `ParserServices` and `JSONSchema4` types now come from declarations devkit ships itself, generated from the same typescript-eslint version. The types are structurally identical, and no runtime code changed.
