# AGENTS.md

> Context for AI coding agents working on eslint-plugin-generalist

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-generalist

# Run tests
nx test eslint-plugin-generalist

# Lint this package
nx lint eslint-plugin-generalist
```

## Code Style

- TypeScript strict mode with `@interlace/eslint-devkit` types
- Use `AST_NODE_TYPES` constants, never string literals for node types
- Use `formatLLMMessage()` for all rule error messages
- Use `c8 ignore` comments with documented reasons for untestable code

## Testing Instructions

- Tests use `@typescript-eslint/rule-tester` with Vitest
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, exports rules and configs
└── rules/            # Rule directories
```

## Plugin Purpose

General-purpose ESLint rules that are framework-agnostic. Provides cross-cutting rules applicable to any JavaScript/TypeScript project.

## Usage

```javascript
// eslint.config.js
import generalist from 'eslint-plugin-generalist';

export default [generalist.configs.recommended];
```
