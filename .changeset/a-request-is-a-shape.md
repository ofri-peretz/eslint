---
'eslint-plugin-node-security': minor
'eslint-plugin-secure-coding': minor
---

**🐛 Fix** — a request is a SHAPE, not a parameter named `req`

`no-sql-injection` and `no-ssrf` decided whether a value came from an HTTP
request by looking at the spelling of the binding it came from. A handler
written `(request, reply)` — Fastify's own convention — or `(event)` on
Lambda was invisible to both, and a local array called `req` was treated as
untrusted input.

They now ask a structural question: is this a read of `.query` / `.params` /
`.headers` / `.cookies` (or `queryStringParameters` / `pathParameters` /
`multiValueHeaders`) off something that ARRIVED as a parameter? A request is
handed to you; it is not constructed locally, whatever it is called.

`body` needs one more level of depth before it counts, because `body` is also
the commonest property name in this ecosystem.

If you have narrowed `requestRoots` yourself, your list still wins — the
shape-based path only applies while that option is at its default.
