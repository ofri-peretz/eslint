---
'eslint-plugin-express-security': minor
---

fix(express-security): treat an exported `(req, res)` handler that calls `res.redirect` / `render` / `sendStatus` / `sendFile` as Express evidence

A controller module defines handlers that a separate routes file registers
(`module.exports.redirect = function (req, res) { res.redirect(req.query.url) }`), so it has no `express`
import and no `app.get('/x', …)` of its own, and every rule in the plugin abstained on it, including
`no-user-controlled-redirect`. The handler is now the evidence: a two-parameter `req`/`res` function that is
exported (`module.exports`, `exports.x`, or a named ES export) and calls one of those four Express-only
response methods. Fastify (`request, reply`), Koa (`ctx`), an unexported helper, a `node:http` listener that
only calls `res.end` / `res.writeHead`, a `res.status().json()` handler and a default export (how a Next.js
API route is written) still do not open the gate. Expect new findings in files of that shape.
