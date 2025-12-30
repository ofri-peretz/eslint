# AGENTS.md

> Context for AI coding agents working on @forge-js/eslint-plugin-llm-optimized

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin

# Run tests
nx test eslint-plugin

# Run tests with coverage
nx test eslint-plugin --coverage

# Lint this package
nx lint eslint-plugin
```

## Code Style

- TypeScript strict mode with `@interlace/eslint-devkit` types
- Use `AST_NODE_TYPES` constants, never string literals for node types
- Use `formatLLMMessage()` for all rule error messages
- Include CWE references in security rule messages
- Use `c8 ignore` comments with documented reasons for untestable code
- Single-pass AST traversal patterns (O(n) complexity)

## Testing Instructions

- Tests use `@typescript-eslint/rule-tester` with Vitest
- Each rule has `index.ts` (implementation) and `*.test.ts` (tests) in same directory
- Run specific rule test: `nx test eslint-plugin --testPathPattern="no-sql-injection"`
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, 6 configs
└── rules/            # 62+ rule directories organized by category
    └── [category]/
        └── [rule-name]/
            ├── index.ts       # Rule implementation
            └── *.test.ts      # Rule tests
```

## Plugin Purpose

**62+ ESLint rules** with error messages optimized for both human developers and Large Language Models. Each rule is designed to be auto-fixable and includes structured context that enables AI assistants to understand violations and apply consistent fixes.

## Available Presets

| Preset         | Description                     |
| -------------- | ------------------------------- |
| `recommended`  | 10 rules (balanced enforcement) |
| `strict`       | All 62+ rules as errors         |
| `security`     | 27 security rules only          |
| `react`        | 3 React-specific rules          |
| `react-modern` | Hooks-focused rules             |
| `sonarqube`    | 2 SonarQube-inspired rules      |

## Rule Categories

| Category     | Rules    | CWEs                                                                |
| ------------ | -------- | ------------------------------------------------------------------- |
| Security     | 27 rules | 20, 22, 78, 79, 89, 95, 269, 306, 327, 330, 400, 697, 798, 915, 942 |
| Architecture | 5 rules  | 407                                                                 |
| Development  | 2 rules  | 532                                                                 |
| React        | 3 rules  | 1104                                                                |

## Error Message Format

All rules produce LLM-optimized 2-line messages:

```
🔒 CWE-89 | SQL Injection detected | CRITICAL
   Fix: Use parameterized query: db.query("SELECT * FROM users WHERE id = ?", [userId]) | https://owasp.org/...
```

## Key Features

| Feature        | Value                   |
| -------------- | ----------------------- |
| Auto-fix rate  | 60-80%                  |
| CWE references | All security rules      |
| Performance    | <10ms overhead per file |
| ESLint MCP     | Fully compatible        |

## Common Fix Patterns

```typescript
// SQL Injection (CWE-89)
// BAD: db.query(`SELECT * FROM users WHERE id = ${userId}`)
// GOOD: db.query('SELECT * FROM users WHERE id = ?', [userId])

// Hardcoded Credentials (CWE-798)
// BAD: const password = 'secret123'
// GOOD: const password = process.env.DB_PASSWORD

// Console.log (CWE-532)
// BAD: console.log(userData)
// GOOD: logger.debug('User data loaded', { userId: user.id })

// Weak Crypto (CWE-327)
// BAD: crypto.createHash('md5')
// GOOD: crypto.createHash('sha256')
```
