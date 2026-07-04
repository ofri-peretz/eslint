---
'eslint-plugin-lambda-security': patch
---

Fix runtime crashes when linting realistic AWS Lambda handlers under ESLint 9.

The published `1.2.3` tarball was a **stale build**: its rules still threw on the
generated lambda-ai-corpus handlers, even though source had already been fixed.
This republishes the corrected build and locks it with a regression test.

- **`no-error-swallowing`** no longer throws `RangeError: Maximum call stack size
exceeded`. The old build walked the catch-block AST by hand and recursed through
  the cyclic `node.parent` reference; source now uses `sourceCode.getText()` + a
  regex.
- **`require-timeout-handling`**, **`no-missing-authorization-check`**, and
  **`no-unbounded-batch-processing`** no longer throw `Error: Unknown class name:
exit`. They used a grouped `:exit` selector (`'A:exit, B:exit, C:exit'`); ESLint
  only strips the trailing `:exit`, so esquery received a bare `:exit`. Source now
  uses one listener key per node type.
- `plugin.meta.version` is now read from `package.json` instead of a hardcoded
  string, so a build can no longer mislabel its own version (1.2.3 embedded
  `1.1.0`).
