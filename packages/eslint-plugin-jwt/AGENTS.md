# AGENTS.md

> Context for AI coding agents working on eslint-plugin-jwt

## Setup Commands

```bash
# Install dependencies (from monorepo root)
npm install

# Build this package
nx build eslint-plugin-jwt

# Run tests
nx test eslint-plugin-jwt

# Run tests with coverage
nx test eslint-plugin-jwt --coverage

# Lint this package
nx lint eslint-plugin-jwt
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
- Run specific rule test: `nx test eslint-plugin-jwt --testPathPattern="no-algorithm-none"`
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, exports rules and configs
└── rules/            # 13 rule directories
    └── [rule-name]/
        ├── index.ts       # Rule implementation
        └── *.test.ts      # Rule tests
docs/rules/           # Markdown documentation per rule
```

## Plugin Purpose

Comprehensive JWT security ESLint plugin with **13 rules** covering algorithm attacks, replay prevention, and claim validation. Targets 6 major Node.js JWT libraries.

## Rule Categories

| Category               | Rules                                                                                                                                            | CWEs               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| Algorithm Attacks      | `no-algorithm-none`, `no-algorithm-confusion`                                                                                                    | 347                |
| Verification & Secrets | `require-algorithm-whitelist`, `no-decode-without-verify`, `no-weak-secret`, `no-hardcoded-secret`, `no-timestamp-manipulation`                  | 326, 345, 757, 798 |
| Claims                 | `require-expiration`, `require-issued-at`, `require-issuer-validation`, `require-audience-validation`, `require-max-age`, `no-sensitive-payload` | 287, 294, 359, 613 |

## Library Detection

The plugin detects these method calls:

- **Sign**: `jwt.sign()`, `signJWT()`, `SignJWT()`
- **Verify**: `jwt.verify()`, `jwtVerify()`, `verifyJWT()`
- **Decode**: `jwt.decode()`, `jwtDecode()`, `decodeJWT()`

## Common Fix Patterns

```typescript
// Algorithm None Attack (CVE-2022-23540)
// BAD: jwt.verify(token, secret, { algorithms: ['none'] })
// GOOD: jwt.verify(token, secret, { algorithms: ['RS256'] })

// Algorithm Confusion
// BAD: jwt.verify(token, publicKey, { algorithms: ['HS256'] })
// GOOD: jwt.verify(token, publicKey, { algorithms: ['RS256'] })

// Hardcoded Secret
// BAD: jwt.sign(payload, 'my-secret-key')
// GOOD: jwt.sign(payload, process.env.JWT_SECRET)

// Missing Expiration
// BAD: jwt.sign({ sub: 'user' }, secret)
// GOOD: jwt.sign({ sub: 'user' }, secret, { expiresIn: '1h' })

// Replay Attack Prevention
// BAD: jwt.sign(payload, secret, { noTimestamp: true })
// GOOD: jwt.sign(payload, secret)
// GOOD: jwt.verify(token, secret, { maxAge: '1h' })
```

## Security Considerations

- CWE coverage: 287, 294, 326, 345, 347, 359, 613, 757, 798
- Detects CVE-2022-23540 (Algorithm None attack)
- Covers 6 major JWT libraries: jsonwebtoken, jose, jwt-decode, node-jose, jwt-simple, jsonwebtoken-esm
