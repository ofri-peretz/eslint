# AGENTS.md

> Context for AI coding agents working on eslint-plugin-secure-coding

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-secure-coding

# Run tests
nx test eslint-plugin-secure-coding

# Run tests with coverage
nx test eslint-plugin-secure-coding --coverage

# Lint this package
nx lint eslint-plugin-secure-coding
```

## Code Style

- TypeScript strict mode with `@interlace/eslint-devkit` types
- Use `AST_NODE_TYPES` constants, never string literals for node types
- Use `formatLLMMessage()` for all rule error messages
- Include CWE, CVSS, OWASP in every security message
- Use `c8 ignore` comments with documented reasons for untestable code
- Single-pass AST traversal patterns (O(n) complexity)

## Testing Instructions

- Tests use `@typescript-eslint/rule-tester` with Vitest
- Each rule has `index.ts` (implementation) and `*.test.ts` (tests) in same directory
- Run specific rule test: `nx test eslint-plugin-secure-coding --testPathPattern="no-sql-injection"`
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, 4 configs
└── rules/            # 89 rule directories organized by category
    └── [category]/
        └── [rule-name]/
            ├── index.ts       # Rule implementation
            └── *.test.ts      # Rule tests
```

## Plugin Purpose

Security-focused ESLint plugin with **89 LLM-optimized rules** for detecting vulnerabilities. Framework-agnostic security covering OWASP Web Top 10 2021 and Mobile Top 10 2024.

## Available Presets

| Preset         | Rules           | Description                         |
| -------------- | --------------- | ----------------------------------- |
| `recommended`  | 89 (mixed)      | Balanced security (Web + Mobile)    |
| `strict`       | 89 (all errors) | Maximum security enforcement        |
| `owasp-top-10` | 32 rules        | OWASP Top 10 2021 compliance        |
| `owasp-mobile` | 40 rules        | OWASP Mobile Top 10 2024 compliance |

## Rule Categories

### Injection Prevention (11 rules)

- `no-sql-injection` - CWE-89
- `database-injection` - CWE-89
- `detect-eval-with-expression` - CWE-95
- `detect-child-process` - CWE-78
- `no-graphql-injection` - CWE-943
- `no-xxe-injection` - CWE-611
- `no-xpath-injection` - CWE-643
- `no-ldap-injection` - CWE-90

### Path & File Security (3 rules)

- `detect-non-literal-fs-filename` - CWE-22
- `no-zip-slip` - CWE-22
- `no-toctou-vulnerability` - CWE-367

### Cryptography (6 rules)

- `no-hardcoded-credentials` - CWE-798
- `no-weak-crypto` - CWE-327
- `no-insufficient-random` - CWE-330
- `no-timing-attack` - CWE-208
- `no-insecure-comparison` - CWE-697
- `no-insecure-jwt` - CWE-347

### Mobile Security (30 rules)

- `no-http-urls` - CWE-319
- `no-credentials-in-storage-api` - CWE-522
- `no-pii-in-logs` - CWE-532
- `require-https-only` - CWE-319
- And 26 more...

## Error Message Format

All rules produce LLM-optimized 2-line structured messages:

```
Line 1: [Icon] [CWE] [OWASP] [CVSS] | [Description] | [SEVERITY] [Compliance]
Line 2:    Fix: [instruction] | [doc-link]
```

## Key Features

| Feature              | Value                            |
| -------------------- | -------------------------------- |
| **Total Rules**      | 89                               |
| **CWE Coverage**     | 100% (all rules include CWE IDs) |
| **OWASP Top 10**     | Full Web (2021) + Mobile (2024)  |
| **AI Auto-Fix Rate** | 60-80%                           |
| **Performance**      | <10ms overhead per file          |
| **Privacy**          | 100% local, no cloud calls       |

## FAQ

**Q: How do I enable all security rules?**
A: Use `secureCoding.configs.strict`

**Q: How do I configure a specific rule?**
A: `'secure-coding/no-sql-injection': ['error', { strategy: 'parameterize' }]`

**Q: How do I disable a rule inline?**
A: `// eslint-disable-next-line secure-coding/no-sql-injection`
