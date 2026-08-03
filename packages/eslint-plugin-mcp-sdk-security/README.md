<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="90" /></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><img src="https://eslint.interlace.tools/eslint-logo.svg" alt="ESLint" height="90" /></a>
</p>

<p align="center">
  Security rules for <a href="https://www.npmjs.com/package/@modelcontextprotocol/sdk">@modelcontextprotocol/sdk</a> — the Model Context Protocol SDK.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security" target="_blank"><img src="https://img.shields.io/npm/v/eslint-plugin-mcp-sdk-security.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security" target="_blank"><img src="https://img.shields.io/npm/dm/eslint-plugin-mcp-sdk-security.svg" alt="NPM Downloads" /></a>
  <a href="https://opensource.org/licenses/MIT" target="_blank"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="Package License" /></a>
</p>

> ⭐ If this plugin caught a real bug for you, [**star the repo**](https://github.com/ofri-peretz/eslint) — it's the signal that keeps these rules maintained.

## Description

Security rules for code built on [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk).

**Scope:** this plugin lints the MCP **SDK's API shapes** — `registerTool`, transports, handler signatures. It does not inspect MCP wire traffic, which isn't visible from source. Every rule gates on the SDK actually being imported, so it stays silent in files that don't use MCP.

## Philosophy

**Interlace** fosters **strength through integration**. Instead of stacking isolated rules, we **interlace** security directly into your workflow to create a resilient fabric of code. We believe tools should **guide rather than gatekeep**, providing educational feedback that strengthens the developer with every interaction.

## Installation

```bash
npm install --save-dev eslint-plugin-mcp-sdk-security
```

## Usage

```js
// eslint.config.js
import mcpSdkSecurity from 'eslint-plugin-mcp-sdk-security';

export default [
  mcpSdkSecurity.configs.recommended,
];
```

Or wire the rules yourself:

```js
import mcpSdkSecurity from 'eslint-plugin-mcp-sdk-security';

export default [
  {
    plugins: { 'mcp-sdk-security': mcpSdkSecurity },
    rules: {
      'mcp-sdk-security/require-tool-input-schema': 'error',
    },
  },
];
```

### oxlint

Every rule in this plugin runs on [oxlint](https://oxc.rs) as well as ESLint:

```json
{ "jsPlugins": ["eslint-plugin-mcp-sdk-security/oxlint"] }
```

## Rules

| Rule | Description | CWE | Recommended |
| --- | --- | --- | --- |
| [require-tool-input-schema](./docs/rules/require-tool-input-schema.md) | Require an input schema when registering an MCP tool | CWE-20 | ✅ error |

## What it catches

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// ❌ handler receives whatever the client sends
server.registerTool('read_file', { description: 'Read a file' }, async (args) => {
  return readFileSync(args.path, 'utf8');
});

// ✅ arguments are constrained before the handler runs
server.registerTool('read_file', {
  description: 'Read a file',
  inputSchema: { path: z.string() },
}, async (args) => {
  return readFileSync(args.path, 'utf8');
});
```

## Roadmap

`0.1.x` covers the tool-registration surface — the entry point for tool poisoning and argument injection. Next: transport authentication on streamable HTTP, resource path traversal, and tool-output handling.

<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If this plugin caught a real bug for you, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and security research behind these rules.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## 📄 License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

<p align="center">
  <a href="https://eslint.interlace.tools/docs/security/plugin-mcp-sdk-security?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security"><img src="https://eslint.interlace.tools/images/og-mcp-sdk-security.png" alt="ESLint Interlace Plugin" width="100%" /></a>
</p>


<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-plugin-mcp-sdk-security" target="blank"><img src="https://eslint.interlace.tools/icon-light.svg" alt="Interlace" height="70" /></a>
</p>
