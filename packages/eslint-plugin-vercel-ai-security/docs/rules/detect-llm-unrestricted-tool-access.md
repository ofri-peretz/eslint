---
title: detect-llm-unrestricted-tool-access
description: 'detect-llm-unrestricted-tool-access'
category: security
tags: ['security', 'ai']
---


> Detect Llm Unrestricted Tool Access

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
  "vercel-ai-security/detect-llm-unrestricted-tool-access": ["error"]
}
```

## Best Practices

Define specific tool allowlists per agent role. Implement tool namespacing.

## Version

Introduced in v1.0.0

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
