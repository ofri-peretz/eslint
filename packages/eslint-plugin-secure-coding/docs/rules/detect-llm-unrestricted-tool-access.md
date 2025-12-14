# detect-llm-unrestricted-tool-access

Detect LLM agents with access to all tools without restrictions.

**OWASP LLM Top 10 2025**: LLM06 - Excessive Agency  
**CWE**: [CWE-732](https://cwe.mitre.org/data/definitions/732.html)  
**Severity**: 🔴 High

## Rule Details

Identifies LLM agents configured with unlimited tool access.

### ❌ Incorrect

```typescript
const agent = {
  tools: allTools,
};

const executor = {
  tools: globalTools,
};
```

### ✅ Correct

```typescript
const agent = {
  tools: [readUsers, searchDocs],
};
```

## Options

```json
{
  "secure-coding/detect-llm-unrestricted-tool-access": ["error"]
}
```

## Best Practices

Define specific tool allowlists per agent role. Implement tool namespacing.

## Version

Introduced in v2.3.0
