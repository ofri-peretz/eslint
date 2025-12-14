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
