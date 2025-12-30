# AGENTS.md

> Context for AI coding agents working on eslint-plugin-express-security

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-express-security

# Run tests
nx test eslint-plugin-express-security

# Run tests with coverage
nx test eslint-plugin-express-security --coverage

# Lint this package
nx lint eslint-plugin-express-security
```

## Code Style

- TypeScript strict mode with `@interlace/eslint-devkit` types
- Use `AST_NODE_TYPES` constants, never string literals for node types
- Use `formatLLMMessage()` for all rule error messages
- Include CWE, CVSS, OWASP in every security message
- Use `c8 ignore` comments with documented reasons for untestable code
- Single-pass AST traversal patterns (O(n) complexity)
- Detect Express objects through heuristics (variable naming, import analysis)

## Testing Instructions

- Tests use `@typescript-eslint/rule-tester` with Vitest
- Each rule has `index.ts` (implementation) and `*.test.ts` (tests) in same directory
- Run specific rule test: `nx test eslint-plugin-express-security --testPathPattern="require-helmet"`
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, exports rules and 4 configs
├── types/index.ts    # Exported rule option types
└── rules/            # 9 rule directories
    └── [rule-name]/
        ├── index.ts       # Rule implementation
        └── *.test.ts      # Rule tests
docs/rules/           # Markdown documentation per rule
```

## Plugin Purpose

Security-focused ESLint plugin with **9 rules** for Express.js applications. Covers security headers (helmet), CORS misconfigurations, CSRF protection, cookie security, rate limiting, ReDoS prevention, and GraphQL security.

## Rule Categories

| Category            | Rules                                                                                                        | CWEs          |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | ------------- |
| Headers & CORS      | `require-helmet`, `no-permissive-cors`, `no-cors-credentials-wildcard`, `require-express-body-parser-limits` | 693, 770, 942 |
| CSRF & Cookies      | `require-csrf-protection`, `no-insecure-cookie-options`                                                      | 352, 614      |
| Rate Limiting & DoS | `require-rate-limiting`, `no-express-unsafe-regex-route`                                                     | 770, 1333     |
| GraphQL             | `no-graphql-introspection-production`                                                                        | 200           |

## Common Fix Patterns

```typescript
// Helmet
// BAD: const app = express()
// GOOD: const app = express(); app.use(helmet())

// CORS
// BAD: app.use(cors({ origin: '*' }))
// GOOD: app.use(cors({ origin: ['https://your-app.com'] }))

// CSRF
// BAD: app.post('/api/transfer', handler)
// GOOD: app.use(csurf({ cookie: true })); app.post('/api/transfer', handler)

// Cookies
// BAD: res.cookie('session', token)
// GOOD: res.cookie('session', token, { httpOnly: true, secure: true, sameSite: 'strict' })

// Rate limiting
// BAD: app.post('/api/login', handler)
// GOOD: app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 100 }))

// Body parser limits
// BAD: app.use(express.json())
// GOOD: app.use(express.json({ limit: '100kb' }))
```

## Security Considerations

- All rules map to OWASP Top 10 2021: A01, A03, A05, A07
- CWE coverage: 200, 352, 614, 693, 770, 942, 1333
- Middleware-aware detection: helmet, cors, csurf, express-rate-limit
