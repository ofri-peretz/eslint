# AGENTS.md

> Context for AI coding agents working on eslint-plugin-mcp-optimized

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-mcp-optimized

# Run tests
nx test eslint-plugin-mcp-optimized

# Lint this package
nx lint eslint-plugin-mcp-optimized
```

## Code Style

- This package is a **barrel export** of `@forge-js/eslint-plugin-llm-optimized`
- Do not add new rules here; add them to the main `eslint-plugin` package
- Only modify `src/index.ts` to change re-exports

## Testing Instructions

- Tests verify proper re-export functionality
- Run: `nx test eslint-plugin-mcp-optimized`

## Project Structure

```
src/
└── index.ts          # Re-exports from @forge-js/eslint-plugin-llm-optimized
```

## Plugin Purpose

ESLint rules optimized for **Model Context Protocol (MCP)**. This package is a **barrel export** that re-exports everything from `@forge-js/eslint-plugin-llm-optimized`, specifically designed for use with ESLint's MCP integration.

## Package Relationship

**Functionally identical to:**

- `@forge-js/eslint-plugin-llm-optimized` (scoped version, main implementation)
- `eslint-plugin-llm` (short name variant)
- `eslint-plugin-llm-optimized` (unscoped descriptive version)
- `eslint-plugin-mcp` (MCP short name variant)

## Available Presets

| Preset        | Description                     |
| ------------- | ------------------------------- |
| `recommended` | 10 rules (balanced enforcement) |
| `strict`      | All 62+ rules as errors         |
| `security`    | 27 security rules only          |
| `react`       | 3 React-specific rules          |
| `sonarqube`   | 2 SonarQube-inspired rules      |

## Usage

```javascript
// eslint.config.js
import mcpOptimized from 'eslint-plugin-mcp-optimized';

export default [mcpOptimized.configs.recommended];
```

## Rule Prefix

All rules use the `mcp-optimized/` prefix:

- `mcp-optimized/no-sql-injection`
- `mcp-optimized/no-console-log`
- `mcp-optimized/no-hardcoded-credentials`
