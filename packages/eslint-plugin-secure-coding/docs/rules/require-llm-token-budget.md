# require-llm-token-budget

Require token usage caps per request/user.

**OWASP LLM Top 10 2025**: LLM10 - Unbounded Consumption  
**CWE**: [CWE-770](https://cwe.mitre.org/data/definitions/770.html)  
**Severity**: 🔴 High

## Rule Details

Enforces token budget limits for LLM API calls to prevent cost explosions.

### ❌ Incorrect

```typescript
await llm.complete(prompt);
await openai.chat.completions.create({ messages });
```

### ✅ Correct

```typescript
await checkTokenBudget(userId, estimatedTokens);
await llm.complete(prompt);

await llm.complete(prompt, { maxTokens: 1000 });

const tokenLimit = getTokenLimit(user);
if (estimated < tokenLimit) {
  await llm.chat(messages);
}
```

## Options

```json
{
  "secure-coding/require-llm-token-budget": ["error"]
}
```

## Best Practices

Implement per-user daily token budgets. Track actual vs estimated usage.

## Version

Introduced in v2.3.0

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Prompt from Variable

**Why**: Prompt content from variables not traced.

```typescript
// ❌ NOT DETECTED - Prompt from variable
const prompt = buildPrompt(userInput);
await generateText({ prompt });
```

**Mitigation**: Validate all prompt components.

### Nested Context

**Why**: Deep nesting obscures injection.

```typescript
// ❌ NOT DETECTED - Nested
const messages = [{ role: 'user', content: userInput }];
await chat({ messages });
```

**Mitigation**: Validate at all levels.

### Custom AI Wrappers

**Why**: Custom AI clients not recognized.

```typescript
// ❌ NOT DETECTED - Custom wrapper
myAI.complete(userPrompt);
```

**Mitigation**: Apply rule to wrapper implementations.

