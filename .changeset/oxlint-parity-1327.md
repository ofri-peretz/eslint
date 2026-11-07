---
'eslint-plugin-node-security': patch
'eslint-plugin-secure-coding': patch
---

Same verdict on ESLint and oxlint for two rules:

- `node-security/detect-non-literal-fs-filename` honours `/* global NAME */` declarations under oxlint too. A path built from a declared global (configuration the environment provides) was silent under ESLint and reported under oxlint, whose scope manager does not read the comment.
- `secure-coding/detect-object-injection` puts a copy loop's single finding on its first write in source order. It walked the loop body in parser property order, so an `if … else` copy reported its `else` write under ESLint and its `then` write under oxlint.
