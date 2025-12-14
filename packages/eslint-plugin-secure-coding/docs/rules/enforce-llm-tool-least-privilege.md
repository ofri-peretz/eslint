# enforce-llm-tool-least-privilege

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
