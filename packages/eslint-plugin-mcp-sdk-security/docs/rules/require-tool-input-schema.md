---
title: require-tool-input-schema
description: Require an input schema when an MCP tool handler reads arguments.
tags: ['security','mcp']
category: security
severity: medium
cwe: CWE-20
autofix: false
---

# require-tool-input-schema

> Require an input schema when an MCP tool handler reads arguments.

- **CWE:** [CWE-20 — Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
- **OWASP:** A03:2021 — Injection
- **CVSS:** 5.3 (Medium)
- **Presets:** `minimal`, `recommended`, `strict`

## Why

When a tool declares no `inputSchema`, the SDK calls its handler as
`handler(extra)` — v1's `executeToolHandler`, v2's `createToolExecutor`. No
client argument reaches it. A schema-less **zero-argument** tool (`get_time`,
`list_projects`, `whoami`) is therefore correct, and this rule is silent on it.

What is wrong is a schema-less handler that *expects* arguments. The keys it
reads were never declared, so nothing validated them, and the SDK never passes
them: the handler is reading the request context. Either way, the fix is to
declare the schema.

## Rule details

The rule fires only in files that import an MCP server package
(`@modelcontextprotocol/sdk`, the v2 `@modelcontextprotocol/*` packages,
`mcp-handler`). It reports a `registerTool(...)` / legacy `tool(...)` call with
no input schema whose handler — inline, or a function declared in the same
file — does one of:

- destructures a key from its first parameter that is not a request-context
  key (`signal`, `authInfo`, `sessionId`, `_meta`, `requestInfo`, `mcpReq`,
  `http`, …);
- reads such a named property off its first parameter (`args.path`);
- declares a second parameter, which without a schema is always `undefined`.

It stays silent when it cannot see the configuration or the handler: a config
passed by reference or containing a spread, a legacy object it cannot classify
as a params shape or annotations, and a handler imported from another module.

## Incorrect

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// `path` is read off the request context — it is never the caller's argument.
server.registerTool('read_file', { description: 'Read a file' }, async ({ path }) =>
  readFileSync(path, 'utf8'),
);

server.tool('delete_record', async (args) => db.delete(args.id));
```

## Correct

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

server.registerTool('read_file', {
  description: 'Read a file',
  inputSchema: { path: z.string() },
}, async ({ path }) => readFileSync(path, 'utf8'));

server.tool('delete_record', { id: z.string().uuid() }, async (args) => db.delete(args.id));

// A zero-argument tool needs no schema.
server.registerTool('get_time', { description: 'Server time' }, async () => ({
  content: [{ type: 'text', text: new Date().toISOString() }],
}));
```

## When not to use it

If the server registers tools through a wrapper that injects the schema, the
rule cannot see it. Disable it at that call site rather than repeating the
schema.

## Further reading

- [MCP — Tools](https://modelcontextprotocol.io/docs/concepts/tools)
- [CWE-20 — Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
