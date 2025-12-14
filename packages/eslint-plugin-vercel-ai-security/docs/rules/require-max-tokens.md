# `require-max-tokens`

> Ensures all AI calls have token limits to prevent resource exhaustion.

## 📊 Rule Details

| Property           | Value                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Type**           | suggestion                                                                                                  |
| **Severity**       | 🟡 HIGH                                                                                                     |
| **OWASP LLM**      | [LLM10: Unbounded Consumption](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| **CWE**            | [CWE-770: Allocation of Resources Without Limits](https://cwe.mitre.org/data/definitions/770.html)          |
| **CVSS**           | 6.5                                                                                                         |
| **Config Default** | `warn` (recommended), `error` (strict)                                                                      |

## 🔍 What This Rule Detects

This rule identifies AI SDK calls that don't specify a `maxTokens` limit. Without limits, AI responses can consume excessive tokens, leading to high costs and potential denial of service.

## ❌ Incorrect Code

```typescript
// No token limit
await generateText({
  model: openai('gpt-4'),
  prompt: 'Write a story',
});

// Missing maxTokens in stream
await streamText({
  model: anthropic('claude-3'),
  prompt: 'Explain quantum physics',
});
```

## ✅ Correct Code

```typescript
// With token limit
await generateText({
  model: openai('gpt-4'),
  prompt: 'Write a story',
  maxTokens: 4096,
});

// Streaming with limit
await streamText({
  model: anthropic('claude-3'),
  prompt: 'Explain quantum physics',
  maxTokens: 2048,
});
```

## ⚙️ Options

| Option             | Type       | Default     | Description                            |
| ------------------ | ---------- | ----------- | -------------------------------------- |
| `allowedFunctions` | `string[]` | `[]`        | Functions that don't require maxTokens |
| `maxRecommended`   | `number`   | `undefined` | Warn if maxTokens exceeds this value   |

## 🛡️ Why This Matters

Unbounded token consumption can cause:

- **Cost explosion** - Each token costs money
- **Denial of service** - API rate limits exhausted
- **Slow responses** - Long generations impact UX
- **Resource starvation** - Other requests may be blocked

## 🔗 Related Rules

- [`require-max-steps`](./require-max-steps.md) - Limit multi-step tool calling
- [`require-abort-signal`](./require-abort-signal.md) - Enable cancellation

## 📚 References

- [OWASP LLM10: Unbounded Consumption](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-770: Allocation of Resources Without Limits](https://cwe.mitre.org/data/definitions/770.html)
- [Vercel AI SDK Generation Options](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text)
