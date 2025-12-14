# `require-request-timeout`

> Requires timeout configuration for AI SDK calls to prevent DoS.

## 📊 Rule Details

| Property           | Value                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Type**           | suggestion                                                                                                    |
| **Severity**       | 🟡 MEDIUM                                                                                                     |
| **OWASP LLM**      | [LLM04: Model Denial of Service](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| **CWE**            | [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)                 |
| **CVSS**           | 5.0                                                                                                           |
| **Config Default** | `warn` (recommended), `error` (strict)                                                                        |

## 🔍 What This Rule Detects

This rule identifies AI SDK calls that don't have timeout or abort signal configuration.

## ❌ Incorrect Code

```typescript
// No timeout
await generateText({
  model: openai('gpt-4'),
  prompt: 'Hello',
});

// Missing timeout in stream
await streamText({
  model: openai('gpt-4'),
  prompt: userInput,
  maxTokens: 4096,
});
```

## ✅ Correct Code

```typescript
// With abort signal timeout
const controller = new AbortController();
setTimeout(() => controller.abort(), 30000);
await generateText({
  model: openai('gpt-4'),
  prompt: 'Hello',
  abortSignal: controller.signal,
});

// With timeout property
await streamText({
  model: openai('gpt-4'),
  prompt: userInput,
  timeout: 30000,
});
```

## ⚙️ Options

| Option         | Type      | Default | Description        |
| -------------- | --------- | ------- | ------------------ |
| `allowInTests` | `boolean` | `true`  | Skip in test files |

## 🛡️ Why This Matters

Missing timeouts can cause:

- **Denial of service** - Requests hang indefinitely
- **Resource exhaustion** - Threads/connections blocked
- **Cost explosion** - Long-running requests accumulate costs
- **Poor UX** - Users wait forever

## 📚 References

- [OWASP LLM04: Model Denial of Service](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)
