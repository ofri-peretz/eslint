---
'eslint-plugin-node-security': patch
---

`no-toctou-vulnerability` no longer reports a check-then-use on a path beneath a directory the code created with `fs.mkdtemp` / `mkdtempSync` (also awaited, and through `path.join` or a template). `mkdtemp` makes a 0700 directory owned by the caller, so no other unprivileged user can create or swap a name inside it: the same absence of a shared namespace the per-user-root exemption already relies on. A path in the shared temp root, a `mkdtemp` that is not `fs`'s, and a path joined from unvalidated input (the Vendure `path.join(importAssetsDir, assetPath)` shape) are still reported. Seen on docmost.
