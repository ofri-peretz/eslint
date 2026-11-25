---
'eslint-plugin-express-security': patch
---

fix(express-security): a Fastify, Koa or Hono file is no longer read as Express

Every rule in the plugin runs only in a file `fileUsesExpress` accepts. Besides an `express` import, it accepts route
shape: a `(req, res, next)` middleware, a `(req, res)` handler registered against a literal path, or an exported
`(req, res)` handler. That shape is how a route module that receives `app` from its caller looks, and it is also how a
Fastify plugin looks: `app.post('/', schema, async (req, res) => …)` inside a `FastifyPluginAsyncZod`. Nine of
activepieces' Fastify controllers were reported 25 times by `no-missing-csrf-protection` and once by
`no-missing-security-headers`.

Route shape no longer counts as evidence in a file that imports Fastify (`fastify`, `fastify-*`, `@fastify/*`), Koa
(`koa`, `koa-*`, `@koa/*`), Hono, hapi, h3 or Elysia. An explicit `express` import still counts in such a file.
