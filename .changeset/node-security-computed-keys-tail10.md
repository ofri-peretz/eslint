---
'eslint-plugin-node-security': patch
---

fix: `stats['isFile']()` asks the same question of the same stat

`no-toctou-vulnerability` matched the stat predicate on `property.name`, so a
fully subscripted check-then-use race went unreported.
