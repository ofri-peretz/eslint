---
title: require-max-steps
description: "This rule identifies AI SDK calls that use tools but don't specify a step limit (maxSteps or stopWhen)"
tags: ['security', 'ai']
category: security
severity: medium
cwe: CWE-834
autofix: false
---

> Prevents infinite tool calling loops in multi-step agents.


<!-- @rule-summary -->
This rule identifies AI SDK calls that use tools but don't specify a step limit (maxSteps or stopWhen)
<!-- @/rule-summary -->

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

This rule identifies AI SDK calls that use tools but don't specify a step limit. Without limits, AI agents can enter infinite loops calling tools repeatedly.

Both idioms satisfy the rule:

- **AI SDK v4**: `maxSteps: 5`
- **AI SDK v5+**: `stopWhen: stepCountIs(5)` (v5 removed `maxSteps` in favor of `stopWhen`; some templates use `isStepCount`)

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
// With maxSteps limit (AI SDK v4)
await generateText({
  model: openai('gpt-4'),
  prompt: 'Research and summarize',
  tools: {
    search: searchTool,
    summarize: summarizeTool,
  },
  maxSteps: 5,
});

// Bounded agent (AI SDK v4)
await streamText({
  model: anthropic('claude-3'),
  prompt: 'Complete the task',
  tools: { search, write, deploy },
  maxSteps: 10,
});

// AI SDK v5+: stopWhen replaces maxSteps
await streamText({
  model: 'openai/gpt-5',
  messages,
  tools: { getWeather },
  stopWhen: stepCountIs(5),
});

// stopWhen also accepts an array of conditions
await generateText({
  model: openai('gpt-4'),
  prompt: 'Complete the task',
  tools: { search, write },
  stopWhen: [stepCountIs(10), hasToolCall('finalize')],
});
```

## ⚙️ Options

| Option              | Type     | Default | Description                            |
| ------------------- | -------- | ------- | -------------------------------------- |
| `suggestedMaxSteps` | `number` | `5`     | Step limit named in the fix message    |

## 🛡️ Why This Matters

Unbounded tool loops can cause:

- **Infinite loops** - AI keeps calling tools forever
- **Cost explosion** - Each tool call may trigger additional API calls
- **Resource exhaustion** - Downstream services overwhelmed
- **Data corruption** - Repeated mutations without checks

## 🔗 Related Rules

- [`require-max-tokens`](./require-max-tokens.md) - Limit token consumption
- [`require-tool-confirmation`](./require-tool-confirmation.md) - Require confirmation

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### stopWhen Without a Step-Count Condition

**Why**: Any `stopWhen` property satisfies the rule — the rule does not statically verify that the condition actually bounds step count.

```typescript
// ❌ NOT FLAGGED - stopWhen present but only stops on a tool call
await generateText({ tools, stopWhen: hasToolCall('finalize') });
```

**Mitigation**: Include a `stepCountIs(n)` condition in `stopWhen` (alone or in an array).

### Options from Variable

**Why**: Options stored in variables are not analyzed.

```typescript
// ❌ NOT DETECTED - Options from variable
const opts = { model: openai('gpt-4'), tools, prompt: 'Hello' }; // No maxSteps
await generateText(opts);
```

**Mitigation**: Use inline options. Always specify maxSteps with tools.

### Tools from Variable

**Why**: Tools added from variables may not trigger detection.

```typescript
// ❌ NOT DETECTED - Tools from variable
const tools = getToolset();
await generateText({ ..., tools }); // Has tools, needs maxSteps
```

**Mitigation**: Always set maxSteps when using tools.

### Conditional Tool Usage

**Why**: Conditionally added tools may not be detected.

```typescript
// ❌ NOT DETECTED - Conditional tools
const options = { model, prompt };
if (useTools) options.tools = toolset; // maxSteps also needed!
await generateText(options);
```

**Mitigation**: Set maxSteps whenever tools may be used.

### Wrapper Functions

**Why**: Custom wrappers may hide tool usage.

```typescript
// ❌ NOT DETECTED - Wrapper with tools
await myAgentGenerate(prompt); // Wrapper adds tools internally
```

**Mitigation**: Apply rule to wrapper implementations.

## 📚 References

- [OWASP LLM10: Unbounded Consumption](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [CWE-834: Excessive Iteration](https://cwe.mitre.org/data/definitions/834.html)
- [Vercel AI SDK Multi-step Agents](https://sdk.vercel.ai/docs/ai-sdk-core/tools)