# eslint-plugin-mcp-optimized

**ESLint rules optimized for Model Context Protocol (MCP).**

[![npm version](https://img.shields.io/npm/v/eslint-plugin-mcp-optimized.svg)](https://www.npmjs.com/package/eslint-plugin-mcp-optimized)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-mcp-optimized.svg)](https://www.npmjs.com/package/eslint-plugin-mcp-optimized)

This package is a barrel export that re-exports everything from `@forge-js/eslint-plugin-llm-optimized`. It provides ESLint rules with error messages optimized for both human developers and Large Language Models, specifically designed to work with ESLint's Model Context Protocol (MCP) integration.

**Core principle:** Every error message should teach, not just warn.

---

## Why This Package?

This package provides a descriptive, MCP-optimized name for developers using ESLint's Model Context Protocol integration. It's functionally identical to `@forge-js/eslint-plugin-llm-optimized` and `eslint-plugin-llm-optimized`, but with a name that emphasizes MCP optimization.

**Perfect for:** Developers using ESLint's MCP server (`@eslint/mcp`) with AI assistants like Cursor, VS Code Copilot, or other MCP-compatible tools who want a descriptive package name.

---

## Installation

```bash
npm install --save-dev eslint-plugin-mcp-optimized
# or
pnpm add -D eslint-plugin-mcp-optimized
# or
yarn add -D eslint-plugin-mcp-optimized
```

**Note:** For TypeScript projects, also install `typescript-eslint`:

```bash
npm install --save-dev typescript-eslint
```

---

## Configuration

### Flat Config (eslint.config.js) - Recommended

```javascript
import mcpOptimized from 'eslint-plugin-mcp-optimized';
import js from '@eslint/js';

export default [js.configs.recommended, mcpOptimized.configs.recommended];
```

### With TypeScript

```javascript
import mcpOptimized from 'eslint-plugin-mcp-optimized';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  mcpOptimized.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'mcp-optimized/database-injection': 'error',
    },
  },
];
```

---

## ESLint MCP Integration

This plugin works seamlessly with ESLint's official MCP server. Configure it in your editor:

**Cursor (.cursor/mcp.json):**
```json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"],
      "env": {}
    }
  }
}
```

**VS Code (.vscode/mcp.json):**
```json
{
  "servers": {
    "ESLint": {
      "type": "stdio",
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
    }
  }
}
```

---

## Related Packages

- **`eslint-plugin-llm`** - LLM-focused variant
- **`eslint-plugin-llm-optimized`** - Descriptive version
- **`eslint-plugin-mcp`** - Short MCP variant
- **`@forge-js/eslint-plugin-llm-optimized`** - Original scoped package
- **[@forge-js/eslint-plugin-utils](https://www.npmjs.com/package/@forge-js/eslint-plugin-utils)** - Build your own LLM-optimized rules

---

## For More Information

See the full documentation at [`@forge-js/eslint-plugin-llm-optimized`](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized) for:
- Complete rule list
- Configuration options
- Integration guides
- Best practices

---

## 📦 Package Transparency

> **Note:** This package is a barrel export of `@forge-js/eslint-plugin-llm-optimized`. It provides an alternative package name for discoverability purposes as part of an A/B testing strategy.

**Why multiple package names?**

This package, along with `eslint-plugin-llm`, `eslint-plugin-llm-optimized`, and `eslint-plugin-mcp`, are all functionally identical barrel exports of the same underlying package (`@forge-js/eslint-plugin-llm-optimized`). They exist to test which package names are most discoverable and resonate with developers.

**All packages:**
- Provide the exact same functionality
- Are maintained and updated together
- Re-export from the same source package
- Can be used interchangeably

You can use whichever package name you prefer - they all work the same way!

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)
