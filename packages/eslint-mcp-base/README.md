# @interlace/eslint-mcp-base

> Generic Model Context Protocol (MCP) server base for any Interlace ESLint plugin. Plugin-specific MCP packages import this and configure with their plugin name; they inherit the four standard agent-callable tools.

## Why this package

The Interlace security vertical has 11 plugins. Each plugin ships an MCP server (`@interlace/secure-coding-mcp`, `@interlace/browser-security-mcp`, etc.) so agents (Claude Code, Cursor, custom MCP clients) can call typed tools instead of shelling out to ESLint.

Without a base, each MCP server is 200+ lines of duplicated boilerplate. With this base, each plugin-specific MCP is < 30 lines of configuration.

## Tools exposed

Every server built on this base inherits these four tools:

| Tool | What it does |
| :--- | :--- |
| `list_rules` | Enumerate every rule in the plugin (id, description, CWE, fixable). Cold-call this first. |
| `audit_file` | Run the plugin against a single file. Returns findings (rule, severity, line, column, message, fixable). |
| `find_rule_violations` | Run a single rule across a directory; returns only that rule's violations. Cheaper than `audit_file` when the agent already knows the rule. |
| `suggest_fix` | Return the auto-fix patch for a finding (file + line + optional ruleId). Output: replacement text + range + confidence. |

## Usage (write a new plugin-specific MCP)

```js
#!/usr/bin/env node
import { startMcpServer } from '@interlace/eslint-mcp-base';

await startMcpServer({
  pluginName: 'secure-coding',
  packageDir: 'eslint-plugin-secure-coding',
  rulePrefix: 'secure-coding',
  serverName: 'secure-coding-mcp',
  serverVersion: '0.1.0',
});
```

That's the entire server.

## Already published plugin-specific servers

- `@interlace/secure-coding-mcp`
- `@interlace/browser-security-mcp`
- `@interlace/node-security-mcp`
- `@interlace/crypto-mcp`
- `@interlace/jwt-mcp`
- `@interlace/express-security-mcp`
- `@interlace/lambda-security-mcp`
- `@interlace/mongodb-security-mcp`
- `@interlace/nestjs-security-mcp`
- `@interlace/vercel-ai-security-mcp`
- `@interlace/pg-mcp`

## Agent integration

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "secure-coding": { "command": "npx", "args": ["@interlace/secure-coding-mcp"] }
  }
}
```

### Cursor

Same `.mcp.json` format. Restart Cursor; the tools appear in the agent panel.

### Custom MCP clients

Spawn the binary, talk JSON-RPC over stdio per the [MCP spec](https://modelcontextprotocol.io/).

## 📦 Compatibility

| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

