---
'eslint-plugin-maintainability': patch
---

fix: `no-silent-errors` accepts a catch that says why it is empty

Defaults `allowWithComment` to `true`, as ESLint core `no-empty` does. A comment inside the block that gives a reason in prose (three or more words, not a placeholder), or a same-line comment after the closing brace, documents the catch. A bare `catch {}`, `// Empty` and `/* handle later */` still report. Set `allowWithComment: false` to restore the old behaviour.
