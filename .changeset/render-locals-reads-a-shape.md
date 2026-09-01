---
'eslint-plugin-express-security': minor
---

**🐛 Fix** — `no-user-controlled-render-locals` reads a request by shape, not by name

The rule decided what a request and a response were by matching the receiver's
NAME against `['req', 'request', 'ctx']` and `['res', 'response', 'reply']`.
Both lists were guesses about your code:

- A handler written `(inbound, outbound)` matched neither, so the rule was
  **completely silent** on it — `outbound.render('v', inbound.body)` went
  unreported.
- Any local variable you happened to call `req` matched the first, whether or
  not it had anything to do with a request.

Both questions are structural now. A request and a response **arrive as
arguments**, so the receiver has to be a function parameter — whatever it is
called. What stays hardcoded is Express's own vocabulary: `body`, `query`,
`params` and `render` are names the framework defines, and they carry a
`@vocabulary` citation saying so.

**You may see new findings** in handlers whose parameters are not named
`req`/`res`, and **fewer** where a local variable shares one of those names.
