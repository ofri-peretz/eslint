# AGENTS.md

> Context for AI coding agents working on eslint-plugin-vercel-ai-security

## Setup Commands

```bash
# Install dependencies (from monorepo root)
npm install

# Build this package
nx build eslint-plugin-vercel-ai-security

# Run tests
nx test eslint-plugin-vercel-ai-security

# Run tests with coverage
nx test eslint-plugin-vercel-ai-security --coverage

# Lint this package
nx lint eslint-plugin-vercel-ai-security
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
- Run specific rule test: `nx test eslint-plugin-vercel-ai-security --testPathPattern="require-validated-prompt"`
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts          # Plugin entry, exports rules and configs
└── rules/            # Rule directories
    └── [rule-name]/
        ├── index.ts       # Rule implementation
        └── *.test.ts      # Rule tests
```

## Plugin Purpose

Security rules for **Vercel AI SDK** (`ai` package). Covers prompt injection, sensitive data exposure, API key security, output handling, tool security, and resource limits.

## Target SDK Functions

```typescript
import {
  generateText,
  streamText,
  generateObject,
  streamObject,
  tool,
} from 'ai';
import { createOpenAI, createAnthropic, createGoogle } from '@ai-sdk/*';
```

## Quick Reference: All 10 Rules

| Rule                        | Severity | Fix Pattern                          |
| --------------------------- | -------- | ------------------------------------ |
| `require-validated-prompt`  | CRITICAL | `prompt: validateInput(userInput)`   |
| `no-sensitive-in-prompt`    | CRITICAL | Remove password/token from prompt    |
| `no-hardcoded-api-keys`     | CRITICAL | `apiKey: process.env.OPENAI_API_KEY` |
| `no-unsafe-output-handling` | CRITICAL | Don't pass `result.text` to `eval()` |
| `require-tool-schema`       | HIGH     | Add `inputSchema: z.object({...})`   |
| `require-max-tokens`        | HIGH     | Add `maxTokens: 4096`                |
| `require-max-steps`         | HIGH     | Add `maxSteps: 5` when using tools   |
| `require-tool-confirmation` | HIGH     | Add `requiresConfirmation: true`     |
| `require-error-handling`    | MEDIUM   | Wrap in `try { } catch { }`          |
| `require-abort-signal`      | LOW      | Add `abortSignal: controller.signal` |

## Common Fix Patterns

```typescript
// Prompt Injection (CWE-74)
// BAD: await generateText({ prompt: userInput })
// GOOD: await generateText({ prompt: validateInput(userInput) })

// API Keys (CWE-798)
// BAD: createOpenAI({ apiKey: 'sk-proj-abc123...' })
// GOOD: createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Tool Schema (CWE-20)
// BAD: tool({ execute: async (params) => search(params) })
// GOOD: tool({ inputSchema: z.object({ query: z.string().max(500) }), execute: ... })

// Max Tokens (CWE-770)
// BAD: await generateText({ prompt: 'Write a story' })
// GOOD: await generateText({ prompt: 'Write a story', maxTokens: 4096 })

// Tool Confirmation (CWE-862)
// BAD: tools: { deleteFile: { execute: async (p) => fs.unlink(p.path) } }
// GOOD: tools: { deleteFile: { requiresConfirmation: true, execute: ... } }
```

## OWASP Reference

| OWASP LLM Top 10 2025   | Rule                                      |
| ----------------------- | ----------------------------------------- |
| LLM01: Prompt Injection | `require-validated-prompt`                |
| LLM02: Sensitive Info   | `no-sensitive-in-prompt`                  |
| LLM05: Output Handling  | `no-unsafe-output-handling`               |
| LLM06: Excessive Agency | `require-tool-confirmation`               |
| LLM10: Unbounded        | `require-max-tokens`, `require-max-steps` |

| OWASP Agentic Top 10 2026 | Rule                        |
| ------------------------- | --------------------------- |
| ASI02: Tool Misuse        | `require-tool-schema`       |
| ASI03: Identity Abuse     | `no-hardcoded-api-keys`     |
| ASI05: Code Execution     | `no-unsafe-output-handling` |
| ASI08: Cascading Failures | `require-error-handling`    |

## Suppression Patterns

```typescript
// Suppress single line
// eslint-disable-next-line vercel-ai-security/require-validated-prompt -- Trusted internal input
await generateText({ prompt: internalPrompt });
```
