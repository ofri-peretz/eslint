---
'eslint-plugin-secure-coding': patch
---

fix(secure-coding): stop flagging safe comparisons and messages found in nestjs/authentication

Each exemption is narrow, and a lookalike that is a real bug still reports.

- `no-insecure-comparison`: record identifiers such as `token.userId` are judged by the field name
  (new `recordMetadataTails` option), a `Buffer.from(x, enc).toString(enc)` round trip over an
  unchanged `x` is a canonical-form check, and the same field from two reads of one store call is a
  concurrency check.
- `no-sensitive-data-exposure`: a message quoting an option with a `true`, `false`, `null` or
  `undefined` setting, when that is the message's only label-and-value pair.
