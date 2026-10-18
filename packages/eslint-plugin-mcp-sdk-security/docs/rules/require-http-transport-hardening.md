---
title: require-http-transport-hardening
description: Require an MCP HTTP server transport to validate the Host header and a network-reachable MCP server to authenticate its callers.
tags: ['security', 'mcp']
category: security
severity: high
cwe: CWE-346
autofix: false
---

> **Keywords:** DNS rebinding, CWE-346, CWE-306, MCP, Model Context Protocol, StreamableHTTPServerTransport, SSEServerTransport, enableDnsRebindingProtection, allowedHosts, createMcpExpressApp, missing authentication

<!-- @rule-summary -->

Require an MCP HTTP server transport to validate the Host header and a network-reachable MCP server to authenticate its callers.
<!-- @/rule-summary -->

**CWE:** [CWE-346](https://cwe.mitre.org/data/definitions/346.html) (and [CWE-306](https://cwe.mitre.org/data/definitions/306.html) for `missingAuth`)
**OWASP:** [A05:2021 – Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)

Detects SDK HTTP transports built with DNS-rebinding protection off, `createMcpExpressApp` bound to every interface with no `allowedHosts`, and an MCP HTTP server bound to every interface with no authentication in the file. This rule is part of [`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security).

💼 This rule is set to **error** in the `strict` config.

## Quick Summary

| Aspect            | Details                                                                              |
| ----------------- | ------------------------------------------------------------------------------------ |
| **CWE Reference** | [CWE-346](https://cwe.mitre.org/data/definitions/346.html) (Origin Validation Error) |
| **Severity**      | High (CVSS 8.1)                                                                      |
| **Auto-Fix**      | ❌ No auto-fix available                                                             |
| **Category**      | Security                                                                             |

| messageId                          | What it reports                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------- |
| `missingRebindingProtection`       | An HTTP transport without `enableDnsRebindingProtection: true` + `allowedHosts` |
| `allInterfacesWithoutAllowedHosts` | `createMcpExpressApp({ host: '0.0.0.0' \| '::' })` with no `allowedHosts`       |
| `missingAuth` (CWE-306)            | An all-interfaces MCP HTTP server with no authentication in the file            |

## Why this matters

The SDK's HTTP transports ship with `enableDnsRebindingProtection: false`.
A server on `localhost` with that default is reachable from any web page the
user opens: the page's own hostname is rebound to `127.0.0.1`, and the
browser then treats the MCP server as same-origin. The page can list and call
every tool, with whatever access the server has to files, shells and tokens.
The Host header is the one thing such a request cannot fake, so validating it
against an allowlist closes the attack.

A server bound to `0.0.0.0` or `::` is reachable by anyone who can reach the
port. With no authentication in front of it, every tool is public.

## SDK v1 and v2 put the protection in different places

| SDK                                                                                  | Where Host validation lives                                                                                                                                                                          | What this rule reports                                                                                                                                                                          |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1 — `@modelcontextprotocol/sdk`, and v2's `@modelcontextprotocol/server-legacy` SSE | The transport: `enableDnsRebindingProtection` + `allowedHosts` (or an app-level validator)                                                                                                           | The transport (`missingRebindingProtection`)                                                                                                                                                    |
| v2 — `@modelcontextprotocol/server`, `/node`, `/express`, `/hono`, `/fastify`        | The app: `createMcpExpressApp` / `createMcpHonoApp` / `createMcpFastifyApp` validate localhost by default, and `allowedHosts` installs `hostHeaderValidation()`. The transports have no such option. | A hand-built `express()` / `new Hono()` / `fastify()` app that serves the transport with no validator (`appWithoutHostValidation`), or an app factory on every interface with no `allowedHosts` |

## ❌ Incorrect

```ts
// ❌ protection off (the default) — any page can rebind to it
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});

// ❌ SSE: the options are the 3rd argument, and there are none
const sse = new SSEServerTransport('/messages', res);

// ❌ protection on, but no allowedHosts — nothing is compared
new StreamableHTTPServerTransport({ enableDnsRebindingProtection: true });

// ❌ every interface, no allowedHosts — the SDK only logs a warning
const app = createMcpExpressApp({ host: '0.0.0.0' });

// ❌ (missingAuth) a transport, an explicit all-interfaces bind, no auth
app.post('/mcp', (req, res) => transport.handleRequest(req, res, req.body));
app.listen(3000, '0.0.0.0');

// ❌ (appWithoutHostValidation) SDK v2 on a hand-built app with no validator
const raw = express();
raw.post('/mcp', (req, res) =>
  new NodeStreamableHTTPServerTransport().handleRequest(req, res, req.body),
);
```

## How it recognises things

- **Transports are resolved to the SDK**, never matched by name:
  `StreamableHTTPServerTransport` and `SSEServerTransport` (v1, and v2's
  `server-legacy`) have their options checked; `NodeStreamableHTTPServerTransport`
  (`@modelcontextprotocol/node`) and `WebStandardStreamableHTTPServerTransport`
  (`@modelcontextprotocol/server`) never do — they mark the file as serving
  SDK v2, as does a call to `createMcpHandler`. A local class with the same name
  is not reported.
- **Apps** are judged only when this file builds them — `express()`,
  `new Hono()`, `fastify()`, resolved to their packages — and registers a route
  on them (`get` / `post` / `put` / `patch` / `delete` / `all` / `route` / `on`).
  An app passed in as a parameter (`function routes(app: Express)`) is not
  judged.
- **Options** are read inline or through a `const` (here or in a relative
  module). `allowedHosts` may be an inline array or a `const` array. A missing
  options argument counts as unprotected.
- **App-level validation suppresses `missingRebindingProtection` and
  `appWithoutHostValidation` for the whole file**: a call to
  `hostHeaderValidation(...)` or `localhostHostValidation()`, or a
  `createMcpExpressApp` / `createMcpHonoApp` / `createMcpFastifyApp` that
  installs one —
  no options (default `127.0.0.1`), a loopback host (`127.0.0.1`,
  `localhost`, `::1`), or any `allowedHosts`.
- **`missingAuth`** reports the bind call when the file constructs an MCP HTTP
  transport and binds every interface — explicitly (`.listen(port, '0.0.0.0')`,
  `.listen(port, '::')`, `.listen({ host: '0.0.0.0' })`, or the
  `createMcpExpressApp` call above), or implicitly: `.listen(port)` with no
  host on an `express()` app, an app from `createMcpExpressApp()` (its `host`
  option picks the Host validation, not the interface — and a network caller
  can send `Host: 127.0.0.1` itself), or a Node `http(s).createServer(…)`
  server binds `::` — and none of these is present:
  - a call to an SDK auth export: `requireBearerAuth`, `mcpAuthRouter`,
    `mcpAuthMetadataRouter`;
  - a `.use(...)` passed custom middleware: an identifier or an inline
    function (`app.use(express.json())` is a factory call and does not count);
  - a route whose handler calls `.handleRequest(` registered with more than a
    path and a handler (`app.post('/mcp', checkAuth, handler)`).
  - an inline credential check: every call that serves the transport
    (`transport.handleRequest(…)`, or a handler built by an SDK adapter such as
    `toNodeHandler(…)`) comes after an `if` that reads a request header
    (`req.headers…`, `req.get(…)`, `c.req.header(…)`, directly or through the
    bindings it is computed from) and returns or throws.
- **A credential check also answers DNS rebinding.** A browser does not send a
  bearer token or an API key header on its own, so a rebound page cannot get
  past the inline check above: `missingRebindingProtection`,
  `appWithoutHostValidation` and `allInterfacesWithoutAllowedHosts` are not
  reported for a file whose transport is served only behind one.

## ✅ Correct

```ts
// ✅ the transport validates Host itself (Host header values, port included)
new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
  enableDnsRebindingProtection: true,
  allowedHosts: ['127.0.0.1:3000', 'localhost:3000'],
});

// ✅ the app validates Host (default host is 127.0.0.1)
const app = createMcpExpressApp();

// ✅ public server: allowedHosts plus bearer auth on the route
const app = createMcpExpressApp({
  host: '0.0.0.0',
  allowedHosts: ['mcp.example.com'],
});
app.post('/mcp', requireBearerAuth({ verifier }), handler);
app.listen(3000, '0.0.0.0');
```

The transport compares `allowedHosts` with the raw `Host` header, port
included. `hostHeaderValidation` and `createMcpExpressApp` compare the hostname
only. The rule checks that a list is present and non-empty, not that its
entries match how clients connect.

## What this rule deliberately does not report

- **Options it cannot read**: a parameter, a factory call, an object with a
  spread or a computed key, or a flag decided at runtime
  (`enableDnsRebindingProtection: process.env.X === '1'`). It abstains rather
  than guess. An explicit `false` is still reported, whatever `allowedHosts`
  holds.
- **`allowedOrigins` alone.** It is not accepted as a substitute for
  `allowedHosts`: the transport skips the Origin check when the header is
  absent, and a same-origin `GET` from a rebound page sends none.
- **A bind whose host it cannot place**: a host from a variable it cannot
  read, a Fastify app (Fastify listens on `localhost` unless told otherwise),
  or an app this file does not build.
- **An app handed to code this file cannot see.** When the app (or the Node
  server wrapping it) is passed to a function from another module —
  `mountAuth(app)` — that function may mount the auth middleware, so
  `missingAuth` abstains. A same-file function is read instead: its `.use(…)`
  calls count. (Before 1.0 this was a documented false positive.)
- **Test files** — `*.test.ts`, `*.spec.ts`, and files under `test/`,
  `tests/`, `e2e/`, `fixtures/`, `__tests__/` and similar (the devkit's shared
  test-file predicate). A server bound for one assertion is not a deployment.
- **A file that imports no MCP server package.**

## Overlap with `node-security` / `secure-coding`

None. Neither plugin knows an MCP transport's options, the SDK's
host-validation middlewares, or which HTTP server is an MCP endpoint.

## When Not To Use It

When every MCP HTTP server in the codebase sits behind a reverse proxy that
validates Host and authenticates, and the files cannot show it. Prefer an
inline `eslint-disable` that names the proxy over turning the rule off.

## Further Reading

- [CWE-346: Origin Validation Error](https://cwe.mitre.org/data/definitions/346.html)
- [CWE-306: Missing Authentication for Critical Function](https://cwe.mitre.org/data/definitions/306.html)
- [MCP: Transports, security warning](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#security-warning)
- [MCP: Authorization](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization)
