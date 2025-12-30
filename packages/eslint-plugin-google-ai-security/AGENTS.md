# AGENTS.md

> Context for AI coding agents working on eslint-plugin-google-ai-security

## Setup Commands

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build this package
nx build eslint-plugin-google-ai-security

# Run tests
nx test eslint-plugin-google-ai-security

# Run tests with coverage
nx test eslint-plugin-google-ai-security --coverage

# Lint this package
nx lint eslint-plugin-google-ai-security
```

## Code Style

- TypeScript strict mode with `@interlace/eslint-devkit` types
- Use `AST_NODE_TYPES` constants, never string literals for node types
- Use `formatLLMMessage()` for all rule error messages
- Include CWE, CVSS, OWASP LLM Top 10 in every security message
- Use `c8 ignore` comments with documented reasons for untestable code
- Single-pass AST traversal patterns (O(n) complexity)

## Testing Instructions

- Tests use `@typescript-eslint/rule-tester` with Vitest
- Each rule has `index.ts` (implementation) and `*.test.ts` (tests) in same directory
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Plugin Purpose

Security rules specifically designed for the **Google AI SDK** (Gemini). Unlike generic security plugins, these rules understand the Google AI API structure and can verify actual security configurations.

## Target SDK

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
await model.generateContent(...);
```

## Key Features

- 🎯 **SDK-Specific**: Rules designed exclusively for Google AI API patterns
- ✅ **Verifiable**: Only checks patterns that can be statically verified
- 🤖 **LLM-Optimized**: Error messages designed for AI coding assistants
- 🔧 **Auto-fix**: Safe automatic fixes where applicable

## Common Fix Patterns

```typescript
// API Keys
// BAD: new GoogleGenerativeAI('AIza...')
// GOOD: new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)

// Error Handling
// BAD: await model.generateContent(...)
// GOOD: try { await model.generateContent(...) } catch (e) { ... }
```

## Security Considerations

- Maps to OWASP LLM Top 10 2025
- CWE coverage for credential exposure and input validation
