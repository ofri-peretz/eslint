---
'eslint-plugin-import-next': patch
---

fix: `order` / `enforce-import-order` no longer writes imports over a hashbang

ESLint models `#!/usr/bin/env node` as a comment, so it came back from `getCommentsBefore` for the first import of an executable script and the autofix replaced from byte 0 — emitting the sorted imports above the hashbang and producing `'#!' can only be used at the start of a file`.

The file then stops parsing, which silences every other rule on it too, and `--fix` is exactly what people run without reading the diff. A hashbang is not a statement and is now never part of an import's range.
