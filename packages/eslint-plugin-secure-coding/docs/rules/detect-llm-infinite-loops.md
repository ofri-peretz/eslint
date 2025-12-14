# detect-llm-infinite-loops

Detect potential infinite reasoning loops in LLM agents.

**OWASP LLM Top 10 2025**: LLM10 - Unbounded Consumption  
**CWE**: [CWE-834](https://cwe.mitre.org/data/definitions/834.html)  
**Severity**: 🔴 High

## Rule Details

Identifies LLM reasoning loops without iteration limits or timeouts.

### ❌ Incorrect

```typescript
while (true) {
  await llm.complete(prompt);
}

while (reasoning) {
  await agent.reason();
}
```

### ✅ Correct

```typescript
for (let i = 0; i < MAX_ITERATIONS; i++) {
  await llm.complete(prompt);
}

let iteration = 0;
while (condition && iteration < 10) {
  await agent.step();
  iteration++;
}
```

## Options

```json
{
  "secure-coding/detect-llm-infinite-loops": ["error"]
}
```

## Best Practices

Set `maxIterations` for all agent loops. Implement execution timeouts.

## Version

Introduced in v2.3.0
