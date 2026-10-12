---
title: no-shared-stateless-transport
description: Disallow sharing one stateless Streamable HTTP transport or one MCP server across requests.
tags: ['security', 'mcp']
category: security
severity: high
cwe: CWE-488
autofix: false
---

> **Keywords:** CVE-2026-25536, CWE-488, MCP, Model Context Protocol, stateless mode, sessionIdGenerator, StreamableHTTPServerTransport, McpServer, cross-client data leak

<!-- @rule-summary -->

Disallow sharing one stateless Streamable HTTP transport or one MCP server across requests.
<!-- @/rule-summary -->

**CWE:** [CWE-488](https://cwe.mitre.org/data/definitions/488.html)
**OWASP:** [A04:2021 – Insecure Design](https://owasp.org/Top10/A04_2021-Insecure_Design/)

Detects a stateless Streamable HTTP transport created once at module level, and a per-request stateless transport connected to an `McpServer` / `Server` that was built outside the request handler. This rule is part of [`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security).

💼 This rule is set to **error** in the `strict` config.

## Quick Summary

| Aspect            | Details                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| **CWE Reference** | [CWE-488](https://cwe.mitre.org/data/definitions/488.html) (Data Element Exposed to Wrong Session) |
| **Severity**      | High (CVSS 7.5)                                                                                    |
| **Auto-Fix**      | ❌ No auto-fix available                                                                           |
| **Category**      | Security                                                                                           |

| messageId                         | What it reports                                                   |
| --------------------------------- | ----------------------------------------------------------------- |
| `statelessTransportAtModuleLevel` | A stateless transport constructed outside every function          |
| `sharedServerAcrossRequests`      | `server.connect(transport)` where the server outlives the request |

## Why this matters

In stateless mode (`sessionIdGenerator: undefined`) a Streamable HTTP transport
has no session ID to key its responses by. It matches a response to a request
by JSON-RPC `id`, and every client numbers its requests from the same small
integers. When one transport, or one `McpServer`, serves two clients at once,
client B's request `id: 1` collides with client A's, and A's tool result is
written to B's HTTP response. That is CVE-2026-25536: one user's data delivered
to another. Patched SDK versions throw on the reuse instead of leaking, which
turns the same code into an outage.

## ❌ Incorrect

```ts
// ❌ one stateless transport for the whole process
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined,
});
await server.connect(transport);
app.post('/mcp', (req, res) => transport.handleRequest(req, res, req.body));

// ❌ a fresh transport per request, but one server for every request
const server = new McpServer({ name: 'demo', version: '1.0.0' });
app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});
```

## How it recognises things

- **Transports are resolved to the SDK**: `StreamableHTTPServerTransport`
  (v1), `NodeStreamableHTTPServerTransport` (`@modelcontextprotocol/node`) and
  `WebStandardStreamableHTTPServerTransport` (`@modelcontextprotocol/server`).
  `SSEServerTransport` has no stateless mode and is not considered.
- **Stateless** means the options, written inline, set `sessionIdGenerator`
  to the global `undefined` (not a shadowing binding) or omit it, or there are
  no options at all.
- **The server** is followed from the `connect()` receiver to the `new` that
  built it, through `const` bindings, `await` and relative imports, and must
  be the SDK's `McpServer` or `Server`. It is shared when its construction does
  not sit inside the function that builds the transport; a server imported
  from another module is always shared.

## ✅ Correct

```ts
// ✅ the SDK's stateless example: both per request
app.post('/mcp', async (req, res) => {
  const server = getServer(); // or new McpServer(...) right here
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// ✅ stateful mode: one transport per session, keyed by a random ID
const transports: Record<string, StreamableHTTPServerTransport> = {};
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
  onsessioninitialized: (id) => {
    transports[id] = transport;
  },
});
```

## What this rule deliberately does not report

- **Options it cannot read**: options in a variable, with a spread, or with a
  computed key. The rule cannot tell whether the transport is stateless.
- **A server from a factory call.** `const server = getServer()` is the SDK's
  per-request pattern. The rule does not look inside the factory, so a factory
  that returns a module-level singleton is missed.
- **A server and transport built once inside a function and closed over by
  the route handler** (`function main() { … app.post('/mcp', () =>
transport.handleRequest(…)) }`). Both are built in the same function, so the
  rule cannot tell that `main` runs once.
- **A class field** (`transport = new StreamableHTTPServerTransport(…)`) is
  evaluated per instance and is not treated as module level.
- **Non-MCP classes of the same name**, and a file that imports no MCP server
  package.

## Overlap with `node-security` / `secure-coding`

None. Neither plugin knows an MCP transport's session mode or which server it
is connected to.

## When Not To Use It

A process that only ever serves one request at a time (a single-client local
server, or a serverless runtime with one concurrent request per instance)
cannot interleave two clients' requests. Prefer an inline `eslint-disable`
that states the concurrency guarantee over turning the rule off.

## Further Reading

- [CWE-488: Exposure of Data Element to Wrong Session](https://cwe.mitre.org/data/definitions/488.html)
- [CVE-2026-25536](https://nvd.nist.gov/vuln/detail/CVE-2026-25536)
- [MCP: Streamable HTTP transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http)
