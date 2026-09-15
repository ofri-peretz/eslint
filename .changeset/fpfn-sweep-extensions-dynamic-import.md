---
'eslint-plugin-import-next': patch
---

fix: `extensions` now checks the specifier of a dynamic `import()`. The rule visited `ImportDeclaration`, `ExportNamedDeclaration` and `ExportAllDeclaration` but not `ImportExpression`, so the identical specifier string was reported on a static import and silent on an `await import(...)` in the same file — leaving the file less consistent after `--fix` than before it, the exact defect the export-from forms were added to remove. A non-literal specifier (template or variable) is still left alone. Surfaces 6 previously-missed findings in the burgee corpus.
