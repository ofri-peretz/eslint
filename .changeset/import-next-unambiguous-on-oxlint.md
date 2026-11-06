---
'eslint-plugin-import-next': patch
---

fix(import-next): `unambiguous` reports again on oxlint. oxlint infers `sourceType` from a file's content, so every file without module syntax reported `script`, and the rule skipped exactly the files it exists to flag. On oxlint only a `commonjs` sourceType (or a `.cjs` / `.cts` extension) now skips the file; on ESLint a configured `script` still does.
