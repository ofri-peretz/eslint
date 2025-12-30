# AGENTS.md

> Context for AI coding agents working on eslint-plugin-code-mode

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-code-mode

# Run tests
nx test eslint-plugin-code-mode

# Lint this package
nx lint eslint-plugin-code-mode
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

ESLint rules for **code mode** enforcement - ensuring code follows specific patterns for AI-assisted development workflows.

## Usage

```javascript
// eslint.config.js
import codeMode from 'eslint-plugin-code-mode';

export default [codeMode.configs.recommended];
```
