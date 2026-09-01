---
'eslint-plugin-node-security': minor
---

**🐛 Fix** — `no-ssrf` reads a request by SHAPE, not by the name `req`

The rule decided whether a value came from an HTTP request by looking at the
spelling of the binding it came from. A handler written `(request, reply)` —
Fastify's own convention — or `(event)` on Lambda was invisible to it, and a
local array called `req` was treated as untrusted input.

It now asks a structural question: is this a read of `.query` / `.params` /
`.headers` / `.cookies` (or API Gateway's `queryStringParameters` /
`pathParameters` / `multiValueHeaders`) off something that ARRIVED as a
parameter? A request is handed to you; it is not constructed locally, whatever
it is called.

`body` needs one more level of depth before it counts, because `body` is also
the commonest property name in this ecosystem.

If you have narrowed `requestRoots` yourself, your list still wins — the
shape-based path applies only while that option is at its default.
