# AGENTS.md

> Context for AI coding agents working on eslint-plugin-mcp

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-mcp

# Run tests
nx test eslint-plugin-mcp

# Lint this package
nx lint eslint-plugin-mcp
```

## Code Style

- This package is a **barrel export** of `@forge-js/eslint-plugin-llm-optimized`
- Do not add new rules here; add them to the main `eslint-plugin` package
- Only modify `src/index.ts` to change re-exports

## Testing Instructions

- Tests verify proper re-export functionality
- Run: `nx test eslint-plugin-mcp`

## Project Structure

```
src/
└── index.ts          # Re-exports from @forge-js/eslint-plugin-llm-optimized
```

## Plugin Purpose

ESLint rules optimized for **Model Context Protocol (MCP)**. This package is a **barrel export** that re-exports everything from `@forge-js/eslint-plugin-llm-optimized`, specifically designed to maximize capabilities when used with ESLint's MCP integration.

## ESLint MCP Integration

Configure MCP in your editor:

**Cursor (.cursor/mcp.json):**

```json
{
  "mcpServers": {
    "eslint": {
      "command": "npx",
      "args": ["@eslint/mcp@latest"]
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

## Package Relationship

**Functionally identical to:**

- `@forge-js/eslint-plugin-llm-optimized` (scoped version, main implementation)
- `eslint-plugin-llm-optimized` (unscoped descriptive version)
- `eslint-plugin-llm` (LLM-focused variant)
- `eslint-plugin-mcp-optimized` (MCP-optimized variant)

## Available Presets

| Preset        | Description                     |
| ------------- | ------------------------------- |
| `recommended` | 10 rules (balanced enforcement) |
| `strict`      | All 30+ rules as errors         |
| `security`    | 18 security rules only          |
| `react`       | 3 React-specific rules          |
| `sonarqube`   | 2 SonarQube-inspired rules      |

## Usage

```javascript
// eslint.config.js
import mcp from 'eslint-plugin-mcp';

export default [mcp.configs.recommended];
```

## Rule Prefix

All rules use the `mcp/` prefix:

- `mcp/no-sql-injection`
- `mcp/no-console-log`
- `mcp/no-hardcoded-credentials`
