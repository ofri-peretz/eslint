---
'eslint-plugin-nestjs-security': minor
---

Two new rules, both in `recommended` at `error`: `no-permissive-cors` and
`require-validation-pipe-whitelist`.

They were chosen by measurement, not intuition. Scanning five real NestJS
applications (lujakob/nestjs-realworld-example-app, notiz-dev/nestjs-prisma-starter,
squareboat/nestjs-boilerplate, ack-nestjs-boilerplate, brocoders/nestjs-boilerplate)
for candidate patterns produced two with a high defect rate and a narrow,
statically-decidable signature:

**`require-validation-pipe-whitelist` (CWE-915).** Three of the five used a bare
`new ValidationPipe()`. Without `whitelist: true` the pipe validates the properties
the DTO declares and keeps the ones it doesn't, so `{ …, "isAdmin": true }` passes
validation with `isAdmin` still attached and any `save(dto)` downstream carries it
into the record. The existing `no-missing-validation-pipe` asks whether a pipe
exists; this asks whether the pipe strips anything.

**`no-permissive-cors` (CWE-942).** Both CORS call sites in the corpus were
permissive — one bare `enableCors()` (defaults to `*`) and one
`enableCors({ origin: true })`. The second is the subtle one: it reflects the
request's own `Origin` header back, so every site passes, and unlike `'*'` it
stays valid with `credentials: true`, letting any page read authenticated
responses.

Precision was verified against the same corpus: **6 findings, 6 true positives,
0 false positives.** Both mature boilerplates (ack, brocoders) come back clean —
brocoders imports its `validationOptions` from another module, and the rule
deliberately does not resolve across files rather than guess. Anything not
statically decidable is left alone: config lookups, callbacks, imported options
objects, and objects with a spread that could supply the missing key.
