# `require-abort-signal`

> Ensures streaming calls have AbortSignal for graceful cancellation.

## 📊 Rule Details

| Property           | Value                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Type**           | suggestion                                                                                                  |
| **Severity**       | ⚪ LOW                                                                                                      |
| **OWASP LLM**      | [LLM10: Unbounded Consumption](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| **CWE**            | [CWE-404: Improper Resource Shutdown](https://cwe.mitre.org/data/definitions/404.html)                      |
| **CVSS**           | 4.0                                                                                                         |
| **Config Default** | `off` (recommended), `warn` (strict)                                                                        |

## 🔍 What This Rule Detects

This rule identifies streaming AI SDK calls (`streamText`, `streamObject`) that don't include an AbortSignal for cancellation.

## ❌ Incorrect Code

```typescript
// No abort signal
await streamText({
  model: openai('gpt-4'),
  prompt: 'Stream a long response',
});

// Missing signal in streamObject
await streamObject({
  model: anthropic('claude-3'),
  prompt: 'Generate object',
  schema: mySchema,
});
```

## ✅ Correct Code

```typescript
// With abort signal
const controller = new AbortController();
await streamText({
  model: openai('gpt-4'),
  prompt: 'Stream a long response',
  abortSignal: controller.signal,
});

// Using signal property
await streamObject({
  model: anthropic('claude-3'),
  prompt: 'Generate object',
  schema: mySchema,
  signal: abortController.signal,
});
```

## ⚙️ Options

| Option                | Type       | Default                     | Description                               |
| --------------------- | ---------- | --------------------------- | ----------------------------------------- |
| `signalPropertyNames` | `string[]` | `['abortSignal', 'signal']` | Property names that provide abort signals |

## 🛡️ Why This Matters

Without abort signals:

- **Resource leaks** - Streams continue after user navigation
- **Wasted costs** - Tokens consumed after request cancelled
- **Server overhead** - Backend continues processing
- **Poor UX** - No way to cancel long operations

## 🔗 Related Rules

- [`require-max-tokens`](./require-max-tokens.md) - Limit token consumption
- [`require-error-handling`](./require-error-handling.md) - Handle errors

## 📚 References

- [OWASP LLM10: Unbounded Consumption](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-404: Improper Resource Shutdown](https://cwe.mitre.org/data/definitions/404.html)
- [Vercel AI SDK Streaming](https://sdk.vercel.ai/docs/ai-sdk-core/streaming)
