# AGENTS.md

> Context for AI coding agents working on eslint-plugin-import-next

## Setup Commands

```bash
# Install dependencies (from monorepo root)
npm install

# Build this package
nx build eslint-plugin-import-next

# Run tests
nx test eslint-plugin-import-next

# Run tests with coverage
nx test eslint-plugin-import-next --coverage

# Lint this package
nx lint eslint-plugin-import-next
```

## Code Style

- TypeScript strict mode with `@interlace/eslint-devkit` types
- Use `AST_NODE_TYPES` constants, never string literals for node types
- Use `formatLLMMessage()` for all rule error messages
- Use `c8 ignore` comments with documented reasons for untestable code
- Single-pass AST traversal patterns (O(n) complexity)

## Testing Instructions

- Tests use `@typescript-eslint/rule-tester` with Vitest
- Each rule has `index.ts` (implementation) and `*.test.ts` (tests) in same directory
- Run specific rule test: `nx test eslint-plugin-import-next --testPathPattern="no-circular"`
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, 6 configs
└── rules/            # 30 rule directories
    └── [rule-name]/
        ├── index.ts       # Rule implementation
        └── *.test.ts      # Rule tests
```

## Plugin Purpose

ESLint plugin for **dependency management** with 30 LLM-optimized rules. Covers module resolution, ES module enforcement, architecture boundaries, export/import style, and dependency management.

## Available Presets

| Preset              | Description                                 |
| ------------------- | ------------------------------------------- |
| `recommended`       | Balanced configuration (13 rules)           |
| `strict`            | All 30 rules as errors                      |
| `module-resolution` | Focus on import/export validation (7 rules) |
| `import-style`      | Focus on import formatting (5 rules)        |
| `esm`               | Enforce ES Modules only (3 rules)           |
| `architecture`      | Enforce module boundaries (6 rules)         |

## Rule Categories

| Category              | Rules                                                                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module Resolution     | `no-unresolved`, `named`, `default`, `namespace`, `extensions`, `no-self-import`, `no-duplicates`                                                                 |
| Module System         | `no-amd`, `no-commonjs`, `no-nodejs-modules`                                                                                                                      |
| Dependency Boundaries | `no-cycle`, `no-internal-modules`, `no-cross-domain-imports`, `enforce-dependency-direction`, `no-restricted-paths`, `no-relative-parent-imports` |
| Export Style          | `no-default-export`, `no-named-export`, `prefer-default-export`, `no-anonymous-default-export`, `no-mutable-exports`, `no-deprecated`                             |
| Import Style          | `enforce-import-order`, `first`, `newline-after-import`, `no-unassigned-import`                                                                                   |
| Dependency Management | `no-extraneous-dependencies`, `no-unused-modules`, `max-dependencies`, `prefer-node-protocol`                                                                     |

## Common Fix Patterns

```typescript
// Circular dependencies (CWE-407)
// BAD: A.ts imports B.ts, B.ts imports A.ts
// GOOD: Extract shared code to types.ts, break cycle

// Node.js protocol
// BAD: import { readFile } from 'fs'
// GOOD: import { readFile } from 'node:fs'

// Import order
// BAD: import local from './local'; import external from 'external';
// GOOD: import external from 'external'; import local from './local';

// No CommonJS
// BAD: const x = require('./module')
// GOOD: import x from './module'
```
