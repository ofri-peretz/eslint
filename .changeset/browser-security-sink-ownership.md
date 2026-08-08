---
'@interlace/eslint-devkit': minor
'eslint-plugin-browser-security': minor
---

Stop the source-specific sink rules double-reporting with the generic ones, and
make each one actually check its own source.

Measured on the shipped tarball, with `browser-security/recommended` and nothing
else enabled, every source shape reported more than once at the **identical
range**:

| code | rules that fired |
| --- | --- |
| WebSocket → `innerHTML` | `no-innerhtml` + `no-websocket-innerhtml` |
| WebSocket → `eval` | `no-eval` + `no-websocket-eval` |
| `postMessage` → `innerHTML` | `no-innerhtml` + `no-postmessage-innerhtml` + `no-websocket-innerhtml` |
| FileReader → `innerHTML` | `no-innerhtml` + `no-filereader-innerhtml` |
| Worker → `innerHTML` | `no-innerhtml` + `no-websocket-innerhtml` + `no-worker-message-innerhtml` |

Two separate defects produced that table. The source rules gated on the *handler
shape* — `X.onmessage = fn` — and never on what `X` was, so they fired alongside
the generic rule on the same value, and `no-websocket-innerhtml` fired on
`postMessage` and Worker handlers too: a finding that said "WebSocket message
data" and linked the WebSocket MDN page for code containing no WebSocket.

New `@interlace/eslint-devkit` export `createPayloadResolver` resolves a
handler's receiver back to its construction (`new WebSocket` / `new Worker` /
`new SharedWorker` / `new FileReader`, plus the global receivers for
`postMessage`). The ownership rule it enforces: **a source rule reports only what
it can positively attribute; the generic rule reports everything else.** The two
tests are complements, so exactly one rule reports any given value.

An unresolvable receiver now falls to `no-innerhtml` / `no-eval` rather than
being reported as a WebSocket. Nothing goes unreported — the finding moves rules,
and its message stops claiming a provenance it cannot prove.
