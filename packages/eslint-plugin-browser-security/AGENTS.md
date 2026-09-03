# AGENTS.md

> Context for AI coding agents working on eslint-plugin-browser-security

## Setup Commands

```bash
# Install dependencies (from monorepo root)
npm install

# Build this package
nx build eslint-plugin-browser-security

# Run tests
nx test eslint-plugin-browser-security

# Run tests with coverage
nx test eslint-plugin-browser-security --coverage

# Lint this package
nx lint eslint-plugin-browser-security
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
- Run specific rule test: `nx test eslint-plugin-browser-security --testPathPattern="no-innerhtml"`
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, exports rules and 7 configs
└── rules/            # 21 rule directories
    └── [rule-name]/
        ├── index.ts       # Rule implementation
        └── *.test.ts      # Rule tests
docs/rules/           # Markdown documentation per rule
```

## Plugin Purpose

Security-focused ESLint plugin with **21 rules** for browser application security. Covers XSS prevention, postMessage abuse, storage security, cookie security, WebSocket vulnerabilities, File API, Workers, and CSP.

## Rule Categories

| Category           | Rules                                                                                                                    | CWEs         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------ |
| XSS Prevention     | `no-innerhtml`, `no-eval`                                                                                                | 79, 95       |
| postMessage        | `require-postmessage-origin-check`, `no-postmessage-wildcard-origin`, `no-postmessage-innerhtml`                         | 79, 346      |
| Storage            | `no-sensitive-localstorage`, `no-sensitive-sessionstorage`, `no-sensitive-indexeddb`, `no-jwt-in-storage`                | 922          |
| Cookies            | `no-sensitive-cookie-js`, `no-cookie-auth-tokens`, `require-cookie-secure-attrs`                                         | 614, 1004    |
| WebSocket          | `require-websocket-wss`, `no-websocket-innerhtml`, `no-websocket-eval`                                                   | 79, 95, 319  |
| File API & Workers | `no-filereader-innerhtml`, `require-blob-url-revocation`, `no-dynamic-service-worker-url`, `no-worker-message-innerhtml` | 79, 401, 829 |
| CSP                | `no-unsafe-inline-csp`, `no-unsafe-eval-csp`                                                                             | 79, 95       |

## Common Fix Patterns

```typescript
// XSS - innerHTML
// BAD: element.innerHTML = userInput
// GOOD: element.textContent = userInput
// GOOD: element.innerHTML = DOMPurify.sanitize(userInput)

// postMessage origin check
// BAD: window.addEventListener('message', (e) => process(e.data))
// GOOD: window.addEventListener('message', (e) => {
//   if (e.origin !== 'https://trusted.com') return;
//   process(e.data);
// })

// Storage - JWT
// BAD: localStorage.setItem('token', jwt)
// GOOD: Use HttpOnly cookies set by server

// WebSocket
// BAD: new WebSocket('ws://example.com')
// GOOD: new WebSocket('wss://example.com')
```

## Security Considerations

- All rules map to OWASP Top 10 2021 categories
- CWE coverage: 79, 95, 319, 346, 401, 614, 829, 922, 1004
- Every rule message includes remediation guidance for both humans and LLMs
