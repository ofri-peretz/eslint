---
'eslint-plugin-node-security': patch
---

fix(node-security): stop flagging three safe shapes found in NestJS's own code

Each exemption is narrow, and a lookalike that is a real bug still reports.

- `no-dynamic-algorithm-selection`: a value the compiler holds to a union of string literals
  (`satisfies`, a declared return type, or a same-file helper whose cast body is built only from
  literals and closed-typed parameters). A bare `req.query.algorithm as 'sha256'` still reports.
- `no-timing-unsafe-compare`: an imported binding such as Nest's `REQUEST` DI token is not the
  request object. An imported function called with request data still reports.
- `require-stream-error-handler`: `return src.pipe(dest)` hands `dest` to the caller, which attaches
  the error handler. A pipe returned from a callback still reports.
