---
'eslint-plugin-secure-coding': minor
---

**✨ Feature** — `no-unsafe-regex-construction` gains `requestRootNames`

The rule already did half of this correctly: the name **selects** a candidate
inbound request, and `isInboundRequestBinding` then **decides**, requiring a
handler parameter — so a module-local `const request = Object.freeze({…})` was
never treated as a request whatever it was called.

But the selecting list was `req | request | ctx | event | message`, and Express,
Koa and Lambda all take the request **positionally**. A handler written
`(inbound, outbound)` or `(payload)` never got as far as the binding check.
Nothing publishes those words; they were our guess.

```json
"secure-coding/no-unsafe-regex-construction": [
  "error",
  { "requestRootNames": ["req", "inbound", "payload"] }
]
```

Default unchanged, so nothing moves unless you set it.

What stays hardcoded, and now says why: `RegExp`, `RegExp.escape` and `source`
are ECMAScript, and `process.argv` is Node's — a project cannot rename them,
and an option for them would never be set.
