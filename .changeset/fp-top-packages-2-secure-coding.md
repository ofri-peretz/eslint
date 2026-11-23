---
'eslint-plugin-secure-coding': patch
---

Fix false positives found linting popular Node.js and React packages.

- `no-unsafe-regex-construction`: `new RegExp(source, caseSensitive ? undefined : "i")` is not "dynamic flags"; `undefined` is a closed leaf like a string literal. A parameter shadowing `undefined` and any open leaf still report.
- `no-improper-sanitization`: an escape helper that replaces `&`, `<`, `>` and then, in a later reachable statement of the same block, replaces `"` with a quote entity on the same variable (resolved by scope, not spelling) is complete. A chain with no such statement, a shadowing or different variable, a step after a `return`, a step after the value was already used, and a chain that lacks the ampersand step still report.
- `no-xxe-injection`: a call to a parse method that a class or prototype of this file implements, on a receiver that is an instance of it (`this`, a `var _this = this` alias, or a `new Local()` binding), is delegation inside the parser library and is not reported. A prototype method that is only an alias of an external parser, a parameter or imported receiver, and an unrelated external parser that happens to share the method name still report.
