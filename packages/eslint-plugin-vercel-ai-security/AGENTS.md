# AI Agents Guide: eslint-plugin-vercel-ai-security

> 🤖 **Optimized Documentation for AI Coding Assistants (GitHub Copilot, Cursor, Claude, ChatGPT)**

This guide helps AI coding assistants effectively use and fix issues from this ESLint plugin when working with the Vercel AI SDK.

---

## Plugin Overview

| Property        | Value                                           |
| --------------- | ----------------------------------------------- |
| **Name**        | eslint-plugin-vercel-ai-security                |
| **Purpose**     | Security rules for Vercel AI SDK (`ai` package) |
| **SDK Version** | Compatible with ai@^3.0.0                       |
| **Rule Count**  | 10                                              |
| **Coverage**    | 98.31% lines, 122 tests                         |

### Target SDK Functions

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

---

## Quick Reference: All 10 Rules

| Rule                        | Severity | Fix Pattern                                          |
| --------------------------- | -------- | ---------------------------------------------------- |
| `require-validated-prompt`  | CRITICAL | `prompt: validateInput(userInput)`                   |
| `no-sensitive-in-prompt`    | CRITICAL | Remove password/token from prompt                    |
| `no-hardcoded-api-keys`     | CRITICAL | `apiKey: process.env.OPENAI_API_KEY`                 |
| `no-unsafe-output-handling` | CRITICAL | Don't pass `result.text` to `eval()`                 |
| `require-tool-schema`       | HIGH     | Add `inputSchema: z.object({...})`                   |
| `require-max-tokens`        | HIGH     | Add `maxTokens: 4096`                                |
| `require-max-steps`         | HIGH     | Add `maxSteps: 5` when using tools                   |
| `require-tool-confirmation` | HIGH     | Add `requiresConfirmation: true` for delete/transfer |
| `require-error-handling`    | MEDIUM   | Wrap in `try { } catch { }`                          |
| `require-abort-signal`      | LOW      | Add `abortSignal: controller.signal`                 |

---

## Fix Patterns by Rule

### 1. `require-validated-prompt` (CWE-74)

```typescript
// ❌ Before
await generateText({ prompt: userInput });

// ✅ After
await generateText({ prompt: validateInput(userInput) });
// OR
await generateText({ prompt: sanitizePrompt(userInput) });
```

### 2. `no-sensitive-in-prompt` (CWE-200)

```typescript
// ❌ Before
await generateText({ prompt: `Process: ${userPassword}` });

// ✅ After
await generateText({ prompt: `Process: ${redact(userPassword)}` });
// OR remove sensitive data entirely
```

### 3. `no-hardcoded-api-keys` (CWE-798)

```typescript
// ❌ Before
createOpenAI({ apiKey: 'sk-proj-abc123...' });

// ✅ After
createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

### 4. `no-unsafe-output-handling` (CWE-94)

```typescript
// ❌ Before (RCE)
eval(result.text);
element.innerHTML = result.text;

// ✅ After
runInSandbox(result.text);
element.textContent = result.text;
```

### 5. `require-tool-schema` (CWE-20)

```typescript
// ❌ Before
tool({ execute: async (params) => search(params) });

// ✅ After
tool({
  inputSchema: z.object({
    query: z.string().max(500),
  }),
  execute: async ({ query }) => search(query),
});
```

### 6. `require-max-tokens` (CWE-770)

```typescript
// ❌ Before
await generateText({ prompt: 'Write a story' });

// ✅ After
await generateText({ prompt: 'Write a story', maxTokens: 4096 });
```

### 7. `require-max-steps` (CWE-834)

```typescript
// ❌ Before
await generateText({ prompt: 'Research', tools: { search } });

// ✅ After
await generateText({ prompt: 'Research', tools: { search }, maxSteps: 5 });
```

### 8. `require-tool-confirmation` (CWE-862)

```typescript
// ❌ Before
tools: {
  deleteFile: { execute: async (p) => fs.unlink(p.path) },
}

// ✅ After
tools: {
  deleteFile: {
    requiresConfirmation: true,
    execute: async (p) => fs.unlink(p.path),
  },
}
```

### 9. `require-error-handling` (CWE-755)

```typescript
// ❌ Before
const result = await generateText({ prompt });

// ✅ After
try {
  const result = await generateText({ prompt });
} catch (error) {
  logger.error('AI call failed', error);
}
```

### 10. `require-abort-signal` (CWE-404)

```typescript
// ❌ Before
await streamText({ prompt: 'Hello' });

// ✅ After
const controller = new AbortController();
await streamText({ prompt: 'Hello', abortSignal: controller.signal });
```

---

## Complete Secure Pattern

```typescript
// FULLY SECURE API ROUTE
export async function POST(req: Request) {
  const controller = new AbortController();

  try {
    const { prompt } = await req.json();

    // Validate input
    const validatedPrompt = validateInput(prompt);

    // Generate with all safety measures
    const result = await generateText({
      model: openai('gpt-4'),
      prompt: validatedPrompt,
      maxTokens: 4096,
      maxSteps: 5,
      abortSignal: controller.signal,
      tools: {
        search: tool({
          inputSchema: z.object({
            query: z.string().max(500),
          }),
          execute: async ({ query }) => searchDocs(query),
        }),
      },
    });

    // Validate output before use
    return Response.json({ text: sanitizeOutput(result.text) });
  } catch (error) {
    logger.error('AI call failed', error);
    return Response.json({ error: 'Processing failed' }, { status: 500 });
  }
}
```

---

## Suppression Patterns

```typescript
// Suppress single line
// eslint-disable-next-line vercel-ai-security/require-validated-prompt -- Trusted internal input
await generateText({ prompt: internalPrompt });

// Suppress entire file (use sparingly)
/* eslint-disable vercel-ai-security/require-max-tokens */
```

---

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
| ASI09: Trust Exploitation | `require-tool-confirmation` |
