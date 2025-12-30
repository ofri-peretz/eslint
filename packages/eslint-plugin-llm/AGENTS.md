# AGENTS.md

> Context for AI coding agents working on eslint-plugin-llm

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-llm

# Run tests
nx test eslint-plugin-llm

# Lint this package
nx lint eslint-plugin-llm
```

## Code Style

- This package is a **barrel export** of `@forge-js/eslint-plugin-llm-optimized`
- Do not add new rules here; add them to the main `eslint-plugin` package
- Only modify `src/index.ts` to change re-exports

## Testing Instructions

- Tests verify proper re-export functionality
- Run: `nx test eslint-plugin-llm`

## Project Structure

```
src/
└── index.ts          # Re-exports from @forge-js/eslint-plugin-llm-optimized
```

## Plugin Purpose

ESLint rules optimized for Large Language Models. This package is a **barrel export** that re-exports everything from `@forge-js/eslint-plugin-llm-optimized`, providing a shorter, more discoverable package name.

## Package Relationship

**Functionally identical to:**

- `@forge-js/eslint-plugin-llm-optimized` (scoped version, main implementation)
- `eslint-plugin-llm-optimized` (unscoped descriptive version)
- `eslint-plugin-mcp` (MCP-focused variant)
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
import llm from 'eslint-plugin-llm';

export default [llm.configs.recommended];
```

## Rule Prefix

All rules use the `llm/` prefix:

- `llm/no-sql-injection`
- `llm/no-console-log`
- `llm/no-hardcoded-credentials`
