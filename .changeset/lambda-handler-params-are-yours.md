---
'eslint-plugin-lambda-security': minor
---

**✨ Feature** — `eventParamNames` / `contextParamNames`, because a handler's parameters are positional

`require-timeout-handling` and `no-unbounded-batch-processing` decided whether
a function was a Lambda handler by matching its parameter NAMES against a
private list — `event`, `evt`, `e`, `request`, `req`.

AWS documents the signature as `(event, context, callback)` and those three are
its words, but the parameters are **positional**: a handler written
`(payload, runtime)` is perfectly ordinary and matched none of the list. The
abbreviations were our invention, not AWS's.

Position alone cannot replace the test — `params.length >= 1` would make every
one-argument function a handler — so the name is doing real work, and that is
exactly why you have to be able to state it:

```json
"lambda-security/require-timeout-handling": [
  "error",
  { "eventParamNames": ["payload"], "contextParamNames": ["runtime"] }
]
```

Defaults are unchanged, so nothing moves unless you set them.

The list now lives in one place (`utils/handler-params.ts`) rather than three.
The three copies had already drifted: `require-timeout-handling` knew
`lambdaContext` and the others did not.
