# enforce-llm-tool-least-privilege

> Enforce Llm Tool Least Privilege

Ensure LLM tools have minimal necessary permissions.

**OWASP LLM Top 10 2025**: LLM06 - Excessive Agency  
**CWE**: [CWE-250](https://cwe.mitre.org/data/definitions/250.html)  
**Severity**: 🔴 Critical

## Rule Details

Detects LLM tools with excessive permissions (wildcards, admin, all).

### ❌ Incorrect

```typescript
const tool = {
  permissions: ['*'],
};

const tool = {
  permissions: ['admin'],
};
```

### ✅ Correct

```typescript
const tool = {
  permissions: ['read:users', 'write:cart'],
};
```

## Options

```json
{
  "secure-coding/enforce-llm-tool-least-privilege": ["error"]
}
```

## Best Practices

Define specific permissions for each tool. Use RBAC (role-based access control).

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

