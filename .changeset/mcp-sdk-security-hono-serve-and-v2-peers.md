---
'eslint-plugin-mcp-sdk-security': minor
'oxlint-plugin-mcp-sdk-security': minor
---

feat(mcp-sdk-security): @hono/node-server serve() binds are checked, and the manifest names the v2 SDK

- `require-http-transport-hardening` reports `missingAuth` for
  `serve({ fetch, port })` from `@hono/node-server` with no `hostname` (it binds
  every interface, like `listen(port)`) or with `hostname: '0.0.0.0'`, in a file
  that serves MCP over HTTP with no authentication. A file that calls
  `createMcpHandler` now counts as serving MCP over HTTP. The MCP TypeScript
  SDK's own Hono example is this shape.
- `peerDependencies` lists the SDK v2 packages the rules already cover
  (`@modelcontextprotocol/server`, `client`, `core`, `node`, `express`, `hono`,
  `fastify`, `server-legacy`, all `^2.0.0` and optional) next to
  `@modelcontextprotocol/sdk`.
