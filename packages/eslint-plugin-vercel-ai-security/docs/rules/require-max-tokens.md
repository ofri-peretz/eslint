---
title: require-max-tokens
description: "This rule identifies AI SDK calls that don't specify an output token limit (maxOutputTokens on v5+, maxTokens on v4)"
tags: ['security', 'ai']
category: security
severity: medium
cwe: CWE-770
autofix: false
---

> Ensures all AI calls have token limits to prevent resource exhaustion.


<!-- @rule-summary -->
This rule identifies AI SDK calls that don't specify an output token limit (maxOutputTokens on v5+, maxTokens on v4)
<!-- @/rule-summary -->

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

This rule identifies AI SDK calls that don't specify an output token limit — `maxOutputTokens` on AI SDK v5+, `maxTokens` on v4. Without limits, AI responses can consume excessive tokens, leading to high costs and potential denial of service.

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
// AI SDK v5+ — maxOutputTokens
await generateText({
  model: openai('gpt-4'),
  prompt: 'Write a story',
  maxOutputTokens: 4096,
});

// Streaming with limit
await streamText({
  model: anthropic('claude-3'),
  prompt: 'Explain quantum physics',
  maxOutputTokens: 2048,
});

// AI SDK v4 — maxTokens, still accepted by this rule
await generateText({
  model: openai('gpt-4'),
  prompt: 'Write a story',
  maxTokens: 4096,
});
```

> **SDK versions:** v4 used `maxTokens`; v5+ renamed it to `maxOutputTokens`
> (`CallSettings.maxOutputTokens`). The rule accepts either, plus the
> `max_tokens` / `max_output_tokens` snake_case variants used by
> OpenAI-shaped proxies.

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

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Options from Variable

**Why**: Options stored in variables are not analyzed.

```typescript
// ❌ NOT DETECTED - Options from variable
const options = { model: openai('gpt-4'), prompt: 'Hello' }; // Missing maxTokens
await generateText(options);
```

**Mitigation**: Use inline options. Always specify maxTokens explicitly.

### Spread Configuration

**Why**: Spread may hide that maxTokens is missing.

```typescript
// ❌ NOT DETECTED - maxTokens may not be in base
const base = getModelConfig();
await generateText({ ...base, prompt: 'Hello' }); // maxTokens?
```

**Mitigation**: Always set maxTokens explicitly. Don't rely on spread configs.

### Wrapper Functions

**Why**: Custom wrapper functions are not recognized.

```typescript
// ❌ NOT DETECTED - Wrapper hides missing maxTokens
const result = await myGenerateText('Hello'); // Wrapper may not set limit
```

**Mitigation**: Apply rule to wrapper implementations.

### Model Default Limits

**Why**: Model-specific defaults are not considered.

```typescript
// ⚠️ MAY FLAG - Model has reasonable default
await generateText({
  model: openai('gpt-4-turbo'), // Has 4096 default
  prompt: 'Hello',
});
```

**Mitigation**: Explicitly set maxTokens for clarity.

## 📚 References

- [OWASP LLM10: Unbounded Consumption](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-770: Allocation of Resources Without Limits](https://cwe.mitre.org/data/definitions/770.html)
- [Vercel AI SDK Generation Options](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text)