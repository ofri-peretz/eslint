---
'eslint-plugin-node-security': patch
---

fix: no-unsafe-buffer-alloc reads `.length` of a declared Buffer or string as a size in memory

nestjs/mail allocates `message.length * 2 + 5` for dot-stuffing a `message: Buffer`. That is at most twice what is already held, not a length prefix the peer wrote, but the name `message` decided it. The declared type (`Buffer`, `Uint8Array`, `ArrayBuffer`, `string`) is the evidence: an untyped or `any` value may be parsed JSON whose `length` field is any number, and still reports.
