# AGENTS.md

> Context for AI coding agents working on eslint-plugin-llm-optimized

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-llm-optimized

# Run tests
nx test eslint-plugin-llm-optimized

# Lint this package
nx lint eslint-plugin-llm-optimized
```

## Code Style

- This package is a **barrel export** of `@forge-js/eslint-plugin-llm-optimized`
- Do not add new rules here; add them to the main `eslint-plugin` package
- Only modify `src/index.ts` to change re-exports

## Testing Instructions

- Tests verify proper re-export functionality
- Run: `nx test eslint-plugin-llm-optimized`

## Project Structure

```
src/
└── index.ts          # Re-exports from @forge-js/eslint-plugin-llm-optimized
```

## Plugin Purpose

ESLint rules that AI assistants can actually fix. This package is a **barrel export** that re-exports everything from `@forge-js/eslint-plugin-llm-optimized`, providing an unscoped, descriptive package name.

## Package Relationship

**Functionally identical to:**

- `@forge-js/eslint-plugin-llm-optimized` (scoped version, main implementation)
- `eslint-plugin-llm` (short name variant)
- `eslint-plugin-mcp` (MCP-focused variant)
- `eslint-plugin-mcp-optimized` (MCP-optimized variant)

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
import llmOptimized from 'eslint-plugin-llm-optimized';

export default [llmOptimized.configs.recommended];
```

## Rule Prefix

All rules use the `llm-optimized/` prefix:

- `llm-optimized/no-sql-injection`
- `llm-optimized/no-console-log`
- `llm-optimized/no-hardcoded-credentials`

## Key Features

| Feature        | Value                   |
| -------------- | ----------------------- |
| Total Rules    | 62+                     |
| Auto-fix rate  | 60-80%                  |
| CWE references | All security rules      |
| Performance    | <10ms overhead per file |
