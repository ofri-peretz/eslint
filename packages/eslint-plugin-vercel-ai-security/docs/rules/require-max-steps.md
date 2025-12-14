# `require-max-steps`

> Prevents infinite tool calling loops in multi-step agents.

## 📊 Rule Details

| Property           | Value                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| **Type**           | suggestion                                                                                                  |
| **Severity**       | 🟡 HIGH                                                                                                     |
| **OWASP LLM**      | [LLM10: Unbounded Consumption](https://owasp.org/www-project-top-10-for-large-language-model-applications/) |
| **CWE**            | [CWE-834: Excessive Iteration](https://cwe.mitre.org/data/definitions/834.html)                             |
| **CVSS**           | 6.5                                                                                                         |
| **Config Default** | `warn` (recommended), `error` (strict)                                                                      |

## 🔍 What This Rule Detects

This rule identifies AI SDK calls that use tools but don't specify a `maxSteps` limit. Without limits, AI agents can enter infinite loops calling tools repeatedly.

## ❌ Incorrect Code

```typescript
// Tools without maxSteps
await generateText({
  model: openai('gpt-4'),
  prompt: 'Research and summarize',
  tools: {
    search: searchTool,
    summarize: summarizeTool,
  },
});

// Multi-tool agent without limit
await streamText({
  model: anthropic('claude-3'),
  prompt: 'Complete the task',
  tools: { search, write, deploy },
});
```

## ✅ Correct Code

```typescript
// With maxSteps limit
await generateText({
  model: openai('gpt-4'),
  prompt: 'Research and summarize',
  tools: {
    search: searchTool,
    summarize: summarizeTool,
  },
  maxSteps: 5,
});

// Bounded agent
await streamText({
  model: anthropic('claude-3'),
  prompt: 'Complete the task',
  tools: { search, write, deploy },
  maxSteps: 10,
});
```

## ⚙️ Options

| Option           | Type     | Default     | Description                         |
| ---------------- | -------- | ----------- | ----------------------------------- |
| `maxRecommended` | `number` | `undefined` | Warn if maxSteps exceeds this value |

## 🛡️ Why This Matters

Unbounded tool loops can cause:

- **Infinite loops** - AI keeps calling tools forever
- **Cost explosion** - Each tool call may trigger additional API calls
- **Resource exhaustion** - Downstream services overwhelmed
- **Data corruption** - Repeated mutations without checks

## 🔗 Related Rules

- [`require-max-tokens`](./require-max-tokens.md) - Limit token consumption
- [`require-tool-confirmation`](./require-tool-confirmation.md) - Require confirmation

## 📚 References

- [OWASP LLM10: Unbounded Consumption](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-834: Excessive Iteration](https://cwe.mitre.org/data/definitions/834.html)
- [Vercel AI SDK Multi-step Agents](https://sdk.vercel.ai/docs/ai-sdk-core/tools)
