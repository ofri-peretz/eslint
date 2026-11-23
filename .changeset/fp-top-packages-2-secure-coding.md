---
'eslint-plugin-secure-coding': patch
---

Fix false positives found linting popular Node.js and React packages.

- `no-unsafe-regex-construction`: `new RegExp(source, caseSensitive ? undefined : "i")` is not "dynamic flags"; `undefined` is a closed leaf like a string literal. A parameter shadowing `undefined` and any open leaf still report.
- `no-improper-sanitization`: an escape helper that replaces `&`, `<`, `>` and then, in a later statement of the same block, replaces `"` with a quote entity on the same variable (`if (quote) { s = s.replace(/"/g, '&quot;') }`) is complete. A chain with no such statement, a different variable or character, or a statement before the chain still reports.
- `no-xxe-injection`: a call to a parse method the same file defines (`this.parseString(...)` inside the file that defines `Parser.prototype.parseString`) is delegation inside the parser library and is not reported. A `parseString` defined elsewhere, and an inner call into an external parser with entities on, still report.
