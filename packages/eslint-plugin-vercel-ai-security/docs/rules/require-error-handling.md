# `require-error-handling`

> Ensures AI SDK calls are wrapped in try-catch to prevent cascading failures.

## 📊 Rule Details

| Property           | Value                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **Type**           | suggestion                                                                                              |
| **Severity**       | 🟠 MEDIUM                                                                                               |
| **OWASP Agentic**  | [ASI08: Cascading Failures](https://owasp.org)                                                          |
| **CWE**            | [CWE-755: Improper Handling of Exceptional Conditions](https://cwe.mitre.org/data/definitions/755.html) |
| **CVSS**           | 5.0                                                                                                     |
| **Config Default** | `off` (recommended), `error` (strict)                                                                   |

## 🔍 What This Rule Detects

This rule identifies AI SDK calls that aren't wrapped in try-catch blocks. AI calls can fail due to rate limits, network issues, or content filtering.

## ❌ Incorrect Code

```typescript
// No error handling
async function handler() {
  const result = await generateText({
    prompt: 'Hello',
  });
  return result.text;
}

// Missing catch
async function process() {
  const stream = await streamText({
    prompt: 'Stream this',
  });
  return stream;
}
```

## ✅ Correct Code

```typescript
// With try-catch
async function handler() {
  try {
    const result = await generateText({
      prompt: 'Hello',
    });
    return result.text;
  } catch (error) {
    logger.error('AI call failed', error);
    throw new AppError('AI service unavailable');
  }
}

// Error handling with fallback
async function process() {
  try {
    const stream = await streamText({
      prompt: 'Stream this',
    });
    return stream;
  } catch (error) {
    return getFallbackResponse();
  }
}
```

## ⚙️ Options

| Option         | Type      | Default | Description             |
| -------------- | --------- | ------- | ----------------------- |
| `allowInTests` | `boolean` | `true`  | Skip rule in test files |

## 🛡️ Why This Matters

Unhandled AI errors can cause:

- **Cascading failures** - One failure crashes entire system
- **Information leakage** - Stack trace exposes internals
- **Poor user experience** - Generic error pages
- **Silent failures** - Problems go unnoticed

## 🔗 Related Rules

- [`require-audit-logging`](./require-audit-logging.md) - Log AI operations
- [`require-abort-signal`](./require-abort-signal.md) - Enable cancellation

## 📚 References

- [OWASP ASI08: Cascading Failures](https://owasp.org)
- [CWE-755: Improper Handling of Exceptional Conditions](https://cwe.mitre.org/data/definitions/755.html)
