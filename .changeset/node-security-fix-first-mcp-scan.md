---
'eslint-plugin-node-security': patch
'oxlint-plugin-node-security': patch
---

fix(node-security): three false positives found scanning the MCP TypeScript SDK examples and tolaria

- `no-timing-unsafe-compare`: a secret pattern shorter than six letters (`token`,
  `auth`, `hash`, `jwt`, …) now matches only as a whole word of the identifier,
  so `grantedMaxTokens === params.maxTokens` (a count of LLM tokens) is no longer
  a timing oracle. `accessToken`, `x_auth_token` and `JWTValue` still match;
  `authorization` is now a default pattern of its own. A pattern with regex
  syntax keeps substring semantics.
- `no-unsafe-buffer-alloc`: `Buffer.allocUnsafe(n)` filled by `readSync(fd, buf, 0, …)`
  or an awaited `handle.read(buf, 0, …)` and then read only through
  `subarray(0, count)`, `slice(0, count)` or `toString(enc, 0, count)` is no
  longer reported — the uninitialized tail is never looked at. Any other read,
  bound or offset still reports.
- `no-dynamic-command-string`: a parameter of a file-local, unexported function
  whose every call passes a string literal (`commandPath('axe')`) is treated as a
  constant, like a `const`. `no-shell-injection` does not follow parameters, and
  its docs now say why.
