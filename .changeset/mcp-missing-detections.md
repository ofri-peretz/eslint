---
'eslint-plugin-mcp-sdk-security': minor
---

feat(mcp-sdk-security): add 11 rules for the vulnerability classes the plugin could not detect

These rules close the audit's "missing detections" backlog, and none of it is deferred (benchmarks/audits/2026-10-10-fp-fn-mcp-sdk-security.md). Every new rule:

- gates on the MCP SDK being imported;
- resolves sinks and SDK classes through the module they come from, never through a variable name;
- follows a tool argument within the file, through relative imports where it matters.

**Server-side taint rules** (tool arguments, `request.params.arguments` and `ResourceTemplate` variables):

- `no-path-traversal-in-tool` (CWE-22): a path reaching `fs` with no containment check. A `startsWith(root + sep)` check, a `path.relative` / `isAbsolute` check, an allowlist, or a same-file checking helper counts as containment.
- `no-ssrf-in-tool` (CWE-918): an argument that decides the origin of a `fetch` / `axios` / `got` / `undici` / `http(s)` request. An argument after a fixed origin, or a hostname allowlist check, is not reported.
- `no-sql-injection-in-tool` (CWE-89): an argument in the SQL text of a `pg`, `mysql2`, `better-sqlite3`, `sqlite`, `postgres`, `mssql`, `@libsql/client`, `duckdb` or Neon/Vercel Postgres call. Bound parameters and tagged templates are not reported.
- `no-code-injection-in-tool` (CWE-95): an argument reaching `eval`, `Function`, `node:vm` or `vm2`.
- `no-credential-leak-in-tool` (CWE-200): `process.env` in a tool result, the caller's `authInfo.token` in a result, or that token forwarded upstream (token passthrough).

**HTTP transport rules:**

- `require-http-transport-hardening` (CWE-346): Streamable HTTP / SSE transports without DNS-rebinding protection and `allowedHosts`, `createMcpExpressApp` bound to all interfaces without `allowedHosts`, and an all-interfaces server with no authentication.
- `no-shared-stateless-transport` (CWE-488): a stateless transport, or the McpServer it is connected to, shared across requests (CVE-2026-25536).
- `no-predictable-session-id` (CWE-330): a `sessionIdGenerator` built from `Date.now()`, `Math.random()`, a counter or a constant.

**Client-side rules:**

- `no-untrusted-tool-metadata-in-prompt` (CWE-1427): `listTools()` / `listPrompts()` / `listResources()` text written into an LLM prompt instead of its `tools` parameter (tool poisoning).
- `no-untrusted-stdio-command` (CWE-78): a `StdioClientTransport` command chosen by a tool argument, a network response or a project-local config file.

**Hygiene rule:**

- `no-duplicate-tool-name` (CWE-694): one tool name registered twice on a server, or listed twice by a low-level `ListTools` handler.

All new rules are in `recommended` and `strict`. `no-duplicate-tool-name` (CVSS 5.3) is set to `warn` and the rest to `error`. `no-command-injection-in-tool` now also treats `ResourceTemplate` variables as client-controlled.

**Fixes found on the way:** `no-tool-description-injection` no longer crashes ("slot is not iterable") on an MCP file that calls `.toString()`. Tool-argument following now carries the arguments object through a same-file helper that returns it (`argsOf(args).cmd`).

**From a real-code scan** of `modelcontextprotocol/servers`, `typescript-sdk`, `vercel/mcp-handler` and `cloudflare/mcp-server-cloudflare` (567 MCP files): 39 false positives fixed, with 3 true positives kept.

- `require-http-transport-hardening` skips test files and models SDK v2 correctly. v2 transports have no rebinding option, so the rule reports a hand-built app serving them with no Host validation (`appWithoutHostValidation`), or `createMcpExpressApp` / `createMcpHonoApp` / `createMcpFastifyApp` on every interface without `allowedHosts`.
- `no-tool-description-injection` reports only descriptions and titles built from a client (tool arguments, request params, an HTTP request), a remote response, or a file's contents. It no longer reports every runtime value. A helper that forwards its parameter into a description is checked at its call site, same-file or across a relative import.
- `no-credential-leak-in-tool` skips test files and does not report `Object.keys(process.env)`.
- A `declare function` or overload signature no longer crashes the rules that follow helpers.
